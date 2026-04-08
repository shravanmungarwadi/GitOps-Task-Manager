# 📦 Project Phases

Complete breakdown of all 11 phases — what was built, what was learned, and what problems were solved in each phase.

---

## Phase 0 — Source Code ✅

**Goal:** Build a working full-stack application before touching any DevOps tools.

**What was built:**

*Backend (Node.js + Express + PostgreSQL):*
- JWT Authentication — register, login, protected routes
- Full CRUD for Tasks and Categories
- PostgreSQL with auto table creation on startup
- Input validation with express-validator
- Global error handler middleware
- Health check endpoint at `/health`

*Frontend (React + Vite):*
- Login and Register pages
- Dashboard with task cards
- TaskForm for create/edit
- Navbar with logout
- Axios interceptor for JWT auto-attachment
- Search with debounce
- Filter by priority, category, status

*Config files:*
- `vite.config.js` with `/api` proxy for local dev
- `nginx.conf` for production serving
- `.env.example` with all required variables

**Key Learning:** Build and test the app locally first. DevOps tools are meaningless if the app itself doesn't work.

---

## Phase 1 — Dockerfiles ✅

**Goal:** Containerize both frontend and backend using production-grade Dockerfiles.

**What was built:**
- `backend/Dockerfile` — multi-stage build, non-root user (uid 1001)
- `frontend/Dockerfile` — multi-stage build, Nginx serving production build
- `backend/.dockerignore` — excludes node_modules, .env
- `frontend/.dockerignore` — excludes node_modules, dist

**Multi-stage build pattern:**
```
Stage 1 (builder): Install dependencies, build
Stage 2 (production): Copy only what's needed, run as non-root
```

**Key Learnings:**
- Multi-stage builds reduce final image size dramatically
- Never run containers as root — non-root limits attack surface
- `.dockerignore` prevents secrets and large folders from entering image context

---

## Phase 2 — Docker Compose ✅

**Goal:** Run the complete stack locally with one command.

**What was built:**
- `docker-compose.yml` with backend, frontend, postgres services
- Named volume for PostgreSQL data persistence
- All services on same Docker network
- Environment variables for service-to-service communication

**Key Learning:** Docker Compose is for local development. It is not production-grade — no auto-healing, no scaling, no rolling updates.

---

## Phase 3 — Kubernetes Manifests ✅

**Goal:** Write raw Kubernetes YAML files for production deployment.

**What was built (13+ files):**

| File | Purpose |
|---|---|
| `namespaces/namespaces.yaml` | Creates taskmanager namespace |
| `backend/deployment.yaml` | Backend pods with 2 replicas |
| `backend/service.yaml` | ClusterIP service for backend |
| `backend/configmap.yaml` | Environment variables |
| `backend/hpa.yaml` | Horizontal Pod Autoscaler |
| `frontend/deployment.yaml` | Frontend pods with 2 replicas |
| `frontend/service.yaml` | ClusterIP service for frontend |
| `postgres/deployment.yaml` | PostgreSQL single pod |
| `postgres/service.yaml` | ClusterIP service for postgres |
| `postgres/pvc.yaml` | PersistentVolumeClaim |
| `postgres/configmap.yaml` | DB environment variables |
| `secrets/secrets.yaml` | DB password, JWT secret (base64) |
| `ingress/ingress.yaml` | Nginx Ingress routing rules |

**Key Learnings:**
- Kubernetes manifests are verbose but explicit — every detail is controlled
- PVCs separate storage request from storage provisioning
- Secrets must be base64 encoded (not encrypted — use Sealed Secrets in production)

---

## Phase 4 — Local Kubernetes with Kind ✅

**Goal:** Run the Kubernetes manifests on a local cluster.

**What was done:**
- Created kind cluster with control-plane + worker nodes
- Installed Nginx Ingress Controller
- Applied all 13+ manifests
- Added `taskmanager.local` to `/etc/hosts`
- Verified app running at `taskmanager.local`

**Key Learning:** Kind simulates a real Kubernetes cluster locally. `IfNotPresent` pull policy is needed for kind because images are loaded locally, not pulled from a registry.

---

## Phase 5 — ArgoCD GitOps ✅

**Goal:** Connect Kubernetes to GitHub so deployments happen automatically.

**What was done:**
- Installed ArgoCD on kind cluster
- Created `k8s/argocd/application.yaml`
- Connected ArgoCD to GitHub repository
- Configured auto-sync with selfHeal
- Tested GitOps loop — push to Git → ArgoCD auto-deploys

**Key Learnings:**
- ArgoCD continuously reconciles desired state (GitHub) with actual state (K8s)
- `selfHeal: true` reverts any manual changes automatically
- ArgoCD repo-server crashes after kind+WSL2 restarts — fix: `kubectl rollout restart deployment -n argocd`

---

## Phase 6 — GitHub Actions CI/CD ✅

**Goal:** Automate testing, building, and deploying on every code push.

**What was built:**
- `.github/workflows/ci.yml` with 4 jobs

**Job breakdown:**

| Job | Steps | Purpose |
|---|---|---|
| test | npm install + npm test | Catch bugs before deployment |
| scan | Trivy image scan | Security vulnerability check |
| build-push | docker build + push | Publish images to Docker Hub |
| update-helm | sed + git commit | Update image tag in Helm values |

**Bugs fixed:**
- Job 4 was updating `k8s/` directory instead of `helm/values.yaml`
- GitHub Actions needed Read+Write workflow permissions for Job 4 commit

**Key Learnings:**
- CI/CD pipeline = automated quality gate before every deployment
- SHA-based image tags (`sha-abc1234`) are traceable; `:latest` is not
- Git rebase discipline is essential — Job 4 commits back to repo after every push

---

## Phase 7 — Helm Chart ✅

**Goal:** Replace raw Kubernetes YAML with a templatized, configurable Helm chart.

**What was built (18 files):**
- `Chart.yaml` — chart metadata
- `values.yaml` — production defaults
- `values-dev.yml` — kind cluster overrides
- `values-prod.yml` — EKS overrides
- `_helpers.tpl` — fullname, labels, selectors
- 13 template files covering all Kubernetes resources

**Key Bugs Fixed:**

| Bug | Fix |
|---|---|
| `ImagePullBackOff` — images not in kind | `docker tag` + `kind load docker-image` |
| `ImagePullBackOff` — pullPolicy: Always in dev | Changed to `IfNotPresent` |
| Backend `CrashLoopBackOff` — hardcoded DB_HOST | Generate DB_HOST dynamically in ConfigMap template using fullname helper |
| Frontend `CrashLoopBackOff` — hardcoded nginx backend URL | Created `frontend-nginx-configmap.yml` with dynamic hostname |
| Helm requires `values.yaml` not `values.yml` | Renamed to `values.yaml` |

**Golden Rule Established:**
```
backend.replicas must ALWAYS equal hpa.minReplicas
```
If they differ, ArgoCD and HPA fight each other in an infinite loop.

**Key Learning:** Helm fullname collision — `taskmanager` (release) + `gitops-taskmanager` (chart) = `taskmanager-gitops-taskmanager` prefix. All service references must use this exact prefix.

---

## Phase 8 — Prometheus + Grafana ✅

**Goal:** Add production-grade monitoring with custom application metrics.

**What was built:**

*Backend changes:*
- Installed `prom-client` npm package
- Added Counter for `http_requests_total`
- Added Histogram for `http_request_duration_seconds`
- Exposed `/metrics` endpoint

*Kubernetes resources:*
- `monitoring/prometheus-values.yml` — kube-prometheus-stack Helm values
- `monitoring/backend-servicemonitor.yml` — tells Prometheus to scrape backend
- `monitoring/grafana-dashboard.json` — custom 6-panel dashboard

**Dashboard Panels:**
1. HTTP Request Rate (requests/second)
2. Error Rate (5xx responses %)
3. Request Duration P95 (95th percentile latency)
4. Requests by Route (which endpoints are hit most)
5. Active Connections (current open connections)
6. Backend Pod Memory Usage (per pod)

**Bugs Fixed:**
- Wrong image name in `values.yaml` (`taskmanager-backend` → `gitops-taskmanager-backend`)
- `imagePullPolicy: IfNotPresent` preventing fresh pulls on EKS
- CI/CD Job 4 updating wrong path (`k8s/` instead of `helm/values.yaml`)
- ArgoCD watching `k8s/` instead of `helm/`

**Key Learning:** ServiceMonitor label selector must exactly match the backend service labels. In Helm-deployed services, the label is `app.kubernetes.io/component: backend` — not `app: backend`.

---

## Phase 9 — Terraform + AWS EKS ✅

**Goal:** Provision real AWS infrastructure and deploy the app on EKS.

**What was built (6 Terraform files):**

| File | Purpose |
|---|---|
| `backend.tf` | Remote state in S3 + DynamoDB locking |
| `variables.tf` | All configurable values |
| `main.tf` | AWS provider + availability zones |
| `vpc.tf` | VPC, subnets, IGW, NAT Gateway, routes |
| `eks.tf` | EKS cluster, node group, IAM roles, EBS CSI Driver |
| `outputs.tf` | Cluster endpoint, kubeconfig command |

**Bugs Fixed:**

| Bug | Fix |
|---|---|
| K8s 1.29 AMI not available | Changed to version `1.30` |
| Namespace ownership conflict | Run `helm install taskmanager helm/ -f helm/values.yaml` with no namespace flags |
| PVC stuck Pending — wrong StorageClass | Changed from `standard` to `gp2` in values.yaml |
| EBS CSI Driver missing | Added `aws_eks_addon` for `aws-ebs-csi-driver` in eks.tf |
| PostgreSQL `initdb` failed — `lost+found` | Added `subPath: postgres-data` in postgres volumeMount |
| WSL2 DNS timeout | `sudo systemctl restart systemd-resolved` |
| Terraform state lock stuck | `terraform force-unlock [lock-id]` |
| Ingress host `taskmanager.local` — 404 | Changed `host: ""` (empty = accept all) |
| `rewrite-target: /` stripping paths | Removed annotation entirely |
| VPC deletion failed after destroy | Must delete Nginx Ingress BEFORE terraform destroy |

**Cost:** ~$0.32/hour when running (EKS + EC2 + NAT Gateway)

**Key Learnings:**
- EBS CSI Driver is NOT installed by default — must add as addon
- EKS StorageClass is `gp2`, not `standard`
- PostgreSQL + EBS always requires `subPath` to avoid `lost+found` conflict
- Destroy order matters: helm uninstall → wait 60s → terraform destroy

---

## Phase 10 — ArgoCD + Prometheus + Grafana on EKS ✅

**Goal:** Install all monitoring and GitOps tools on the production EKS cluster.

**What was built:**
- Updated `scripts/deploy.sh` — fully automated one-command deployment
- Updated `scripts/destroy.sh` — fully automated one-command teardown
- ArgoCD installed on EKS with LoadBalancer service
- ArgoCD connected to GitHub repo — auto-deploys on every push
- Prometheus + Grafana installed with LoadBalancer service
- ServiceMonitor configured to scrape backend metrics

**Deploy Script Flow:**
```
terraform apply → kubectl connect → nginx ingress → ArgoCD
→ ArgoCD deploys app → Prometheus + Grafana → print all URLs
```

**Destroy Script Flow (correct order to avoid VPC errors):**
```
Delete ArgoCD app → uninstall monitoring → uninstall ingress
→ delete ArgoCD → wait 90s for ELBs → terraform destroy
```

**Bugs Fixed:**
- ArgoCD install failed with 256KB annotation limit → fixed with `--server-side --force-conflicts`
- ServiceMonitor label mismatch (`app: backend` vs `app.kubernetes.io/component: backend`)
- `set -e` causing script exit on ArgoCD warning → handled with `2>/dev/null || true`

**Key Learning:** The correct destroy order is critical. Nginx Ingress must be uninstalled BEFORE `terraform destroy`. Otherwise the AWS ELB remains attached to the VPC, blocking VPC deletion.

---

## Phase 11 — README + Portfolio Polish ✅

**Goal:** Document everything professionally for GitHub portfolio.

**What was built:**
- `README.md` — complete project documentation with badges, diagrams, screenshots
- `docs/architecture.md` — deep dive technical architecture
- `docs/phases.md` — all 11 phases explained
- `docs/setup-guide.md` — how to deploy from scratch
- `docs/screenshots/` — organized screenshots for every feature

**Key Principle:** A great portfolio project is not just about what you built — it's about how clearly you can explain what you built and why you made each decision.
