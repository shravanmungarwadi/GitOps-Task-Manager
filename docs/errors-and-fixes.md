# 🐛 Real Errors Encountered — Phase by Phase

Every single error hit during building this project, with the exact error message, root cause, and fix applied. These are **real bugs** from real debugging sessions — not made up examples.

> This file exists to show that building production-grade DevOps infrastructure is not smooth. Every error below was a learning moment.

---

## Table of Contents

- [Phase 1 — Dockerfiles](#phase-1--dockerfiles)
- [Phase 3 — Kubernetes Manifests](#phase-3--kubernetes-manifests)
- [Phase 4 — Kind Cluster](#phase-4--kind-cluster)
- [Phase 5 — ArgoCD](#phase-5--argocd)
- [Phase 6 — GitHub Actions CI/CD](#phase-6--github-actions-cicd)
- [Phase 7 — Helm Charts](#phase-7--helm-charts)
- [Phase 8 — Prometheus + Grafana](#phase-8--prometheus--grafana)
- [Phase 9 — Terraform + AWS EKS](#phase-9--terraform--aws-eks)
- [Phase 10 — ArgoCD + Monitoring on EKS](#phase-10--argocd--monitoring-on-eks)

---

## Phase 1 — Dockerfiles

### Bug 1 — node_modules Included in Docker Build Context
**Error:**
```
Docker build takes 3-4 minutes, image size is 800MB+
```
**Root Cause:**
No `.dockerignore` file — Docker was copying `node_modules/` (200MB+) into the build context before the multi-stage build even ran.

**Fix:**
Created `backend/.dockerignore` and `frontend/.dockerignore` with:
```
node_modules/
.env
dist/
build/
```
Build time dropped to under 60 seconds. Final image size reduced to ~150MB.

**Lesson:** Always create `.dockerignore` before building. It's the Docker equivalent of `.gitignore`.

---

## Phase 3 — Kubernetes Manifests

### Bug 1 — Secrets Must Be Base64 Encoded
**Error:**
```
Error from server: error validating data: ValidationError(Secret.data): 
invalid value for field: must be base64 encoded
```
**Root Cause:**
Plain text values were put directly in `secrets/secrets.yaml` instead of base64 encoded values.

**Fix:**
Encoded values first:
```bash
echo -n "mypassword" | base64
# Output: bXlwYXNzd29yZA==
```
Then used the encoded value in the Secret manifest.

**Lesson:** Kubernetes Secrets store values as base64 — not encrypted, just encoded. Never put sensitive values in plain text in Secret manifests.

---

## Phase 4 — Kind Cluster

### Bug 1 — Ingress Controller Not Working After Kind Cluster Creation
**Error:**
```
curl: (7) Failed to connect to taskmanager.local port 80: Connection refused
```
**Root Cause:**
Kind cluster was created without the ingress-ready configuration. Standard kind clusters don't expose ports to the host machine.

**Fix:**
Recreated kind cluster with custom config:
```yaml
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    kubeadmConfigPatches:
      - |
        kind: InitConfiguration
        nodeRegistration:
          kubeletExtraArgs:
            node-labels: "ingress-ready=true"
    extraPortMappings:
      - containerPort: 80
        hostPort: 80
        protocol: TCP
      - containerPort: 443
        hostPort: 443
        protocol: TCP
```
**Lesson:** Kind needs explicit port mapping configuration to expose services to the host.

---

## Phase 5 — ArgoCD

### Bug 1 — ArgoCD Self-Heal Not Reacting on Kind + WSL2
**Error:**
```
Manually deleted a pod → ArgoCD took 5+ minutes to recreate it
Expected: instant recreation
```
**Root Cause:**
WSL2's virtualisation layers (Windows Hyper-V → WSL2 → Docker Desktop → kind) introduce significant latency. ArgoCD's polling interval combined with these layers causes delayed reactions. This is a known limitation of kind on WSL2 — not present on real clusters like EKS.

**Fix:**
No fix needed — this is expected behavior on kind+WSL2. On EKS, self-heal reacts within seconds.

**Lesson:** Local kind clusters on WSL2 don't perfectly simulate cloud cluster behavior. Always verify behavior on the target environment.

### Bug 2 — ArgoCD repo-server CrashLoopBackOff After Cluster Restart
**Error:**
```
argocd-repo-server        CrashLoopBackOff
argocd-applicationset-controller  CrashLoopBackOff
```
**Root Cause:**
When a kind cluster restarts (after WSL2 restart or Docker Desktop restart), pods come back up in random order. ArgoCD's `repo-server` and `applicationset-controller` start before Redis is ready. They crash, and the backoff timer kicks in.

**Fix:**
```bash
kubectl rollout restart deployment -n argocd
```
This restarts all ArgoCD deployments simultaneously, giving Redis time to start first.

**Lesson:** This is a known kind+WSL2 limitation. Add this command to your cluster-restart checklist. Not an issue on managed clusters like EKS.

---

## Phase 6 — GitHub Actions CI/CD

### Bug 1 — Git Identity Not Configured in WSL2
**Error:**
```
Author identity unknown
*** Please tell me who you are.
Run:
  git config --global user.email "you@example.com"
  git config --global user.name "Your Name"
```
**Root Cause:**
Fresh WSL2 installation had no Git identity configured. Git refuses to commit without knowing the author.

**Fix:**
```bash
git config --global user.email "shravanmungarwadi@gmail.com"
git config --global user.name "Shravan"
```
**Lesson:** Always configure Git identity in any new environment before committing.

### Bug 2 — GitHub PAT Authentication — Ctrl+V Not Working
**Error:**
```
Password field accepts no input when pasting with Ctrl+V in WSL2 terminal
```
**Root Cause:**
WSL2 terminal does not support Ctrl+V for paste in password fields. The input is silently dropped.

**Fix:**
Right-click in the terminal to paste. This works for password fields in WSL2.

**Lesson:** WSL2 terminal paste behavior is different from native Linux terminals. Right-click = paste in WSL2.

### Bug 3 — GitHub Actions Job 4 Failing with 403 Error
**Error:**
```
remote: Permission to shravanmungarwadi/GitOps-Task-Manager.git denied to github-actions[bot]
fatal: unable to access 'https://github.com/...': The requested URL returned error: 403
```
**Root Cause:**
GitHub Actions workflow permissions were set to Read-only by default. Job 4 needs to commit the updated image tag back to the repository, which requires Write permissions.

**Fix:**
GitHub repo → Settings → Actions → General → Workflow permissions → Select **Read and write permissions** → Save.

**Lesson:** GitHub Actions needs explicit write permissions to push commits back to the repo. Always check this when CI/CD needs to auto-commit.

### Bug 4 — actions/checkout v4 Node.js 20 Deprecation Warning
**Error:**
```
Node.js 16 actions are deprecated. 
Please update the following actions to use Node.js 20: actions/checkout@v4
```
**Root Cause:**
`actions/checkout@v4` uses Node.js 16 which GitHub deprecated. Pipeline still worked but showed warnings.

**Fix:**
Updated `.github/workflows/ci.yml`:
```yaml
- uses: actions/checkout@v5  # Changed from v4
```
Required a `git stash → git pull --rebase → git stash pop` workflow because CI/CD Job 4 had pushed a commit ahead of the local branch.

**Lesson:** Keep GitHub Actions dependencies updated. Use `@v5` or later for `actions/checkout`.

---

## Phase 7 — Helm Charts

### Bug 1 — Helm Requires values.yaml Not values.yml
**Error:**
```
Error: open helm/values.yml: no such file or directory
```
**Root Cause:**
Helm strictly requires the default values file to be named `values.yaml` (not `.yml`). All other YAML files in the chart can use `.yml` but this one file must be `.yaml`.

**Fix:**
```bash
mv helm/values.yml helm/values.yaml
```
**Lesson:** Helm has one exception to the `.yml` rule — `values.yaml` and `Chart.yaml` must use `.yaml`. All template files can use `.yml`.

### Bug 2 — ImagePullBackOff — Images Not in Kind Cluster
**Error:**
```
Failed to pull image "shravanvm/gitops-taskmanager-backend:latest": 
rpc error: pull access denied, repository does not exist or may require 'docker login'
```
**Root Cause:**
Kind cluster cannot pull from Docker Hub during local development. The images exist locally but kind runs in its own Docker network and can't access the local image cache automatically.

**Fix:**
```bash
# Tag the images first
docker tag gitops-taskmanager-backend shravanvm/gitops-taskmanager-backend:latest
docker tag gitops-taskmanager-frontend shravanvm/gitops-taskmanager-frontend:latest

# Load into kind cluster directly
kind load docker-image shravanvm/gitops-taskmanager-backend:latest --name taskmanager
kind load docker-image shravanvm/gitops-taskmanager-frontend:latest --name taskmanager
```
**Lesson:** Kind clusters are isolated. Either load images manually or use a registry. In production (EKS), images are pulled from Docker Hub normally.

### Bug 3 — Backend ImagePullBackOff — pullPolicy: Always on Kind
**Error:**
```
Backend: ImagePullBackOff (after loading image into kind)
Frontend: Running ✅
```
**Root Cause:**
`pullPolicy: Always` forces Kubernetes to contact Docker Hub every time, even if the image is already in kind. Kind has no internet access in this setup, so the pull fails.

**Fix:**
Changed in `values-dev.yml`:
```yaml
backend:
  image:
    pullPolicy: IfNotPresent  # Don't pull if image already exists
```
**Lesson:** Use `IfNotPresent` on kind (local). Use `Always` or SHA tags on EKS (cloud). Never use `Always` with kind.

### Bug 4 — Backend CrashLoopBackOff — Hardcoded DB_HOST
**Error:**
```
Backend logs:
Database connection failed: getaddrinfo ENOTFOUND taskmanager-postgres
connect ECONNREFUSED: taskmanager-postgres:5432
```
**Root Cause:**
`DB_HOST` was hardcoded as `taskmanager-postgres` in the ConfigMap. But Helm generates service names using the fullname helper:
```
Release name: taskmanager
Chart name: gitops-taskmanager
Fullname: taskmanager-gitops-taskmanager
Service name: taskmanager-gitops-taskmanager-postgres
```
The hardcoded name `taskmanager-postgres` didn't exist — the real service was `taskmanager-gitops-taskmanager-postgres`.

**Fix:**
Changed `backend-configmap.yml` to generate DB_HOST dynamically:
```yaml
DB_HOST: {{ include "taskmanager.fullname" . }}-postgres
```
This generates the correct service name automatically regardless of release name.

**Lesson:** Never hardcode service names in Helm charts. Always use the fullname helper. The fullname pattern is always: `{release}-{chart}-{component}`.

### Bug 5 — Frontend CrashLoopBackOff — Hardcoded nginx Backend URL
**Error:**
```
Frontend logs:
nginx: [emerg] host not found in upstream "backend-service" in /etc/nginx/conf.d/default.conf
```
**Root Cause:**
The `nginx.conf` was baked into the frontend Docker image with `proxy_pass http://backend-service:5000`. This hardcoded name didn't match the actual Helm-generated backend service name.

**Fix:**
Created `helm/templates/frontend-nginx-configmap.yml` that generates the nginx config dynamically:
```yaml
proxy_pass http://{{ include "taskmanager.fullname" . }}-backend:{{ .Values.backend.port }};
```
Then mounted this ConfigMap over the baked-in nginx config in the frontend deployment.

**Lesson:** Configuration that references other services must be dynamic. Either use environment variables or ConfigMap mounts to inject the correct hostnames at deployment time.

---

## Phase 8 — Prometheus + Grafana

### Bug 1 — Wrong Image Name in values.yaml
**Error:**
```
ErrImagePull: docker.io/library/taskmanager-backend:sha-abc1234
```
**Root Cause:**
`values.yaml` had `repository: shravanvm/taskmanager-backend` (missing `gitops-` prefix). Docker Hub was looking for `docker.io/shravanvm/taskmanager-backend` which didn't exist. The correct image name was `shravanvm/gitops-taskmanager-backend`.

**Fix:**
```bash
sed -i 's/shravanvm\/taskmanager-backend/shravanvm\/gitops-taskmanager-backend/g' helm/values.yaml
```
**Lesson:** Image repository names in values.yaml must exactly match what's pushed to Docker Hub. Double-check with `docker images | grep taskmanager`.

### Bug 2 — imagePullPolicy: IfNotPresent Preventing Updates
**Error:**
```
Pod running but /metrics endpoint returns 404
New code was pushed but pods still running old image
```
**Root Cause:**
`pullPolicy: IfNotPresent` on EKS meant Kubernetes never pulled the new image from Docker Hub because an image with the same tag already existed on the node. Old code kept running.

**Fix:**
Changed to `pullPolicy: Always` in `values.yaml` for production, AND switched from `:latest` tags to SHA-based tags in CI/CD. SHA tags (`sha-abc1234`) force a new pull because the tag is always different.

**Lesson:** Never use `IfNotPresent` with `:latest` tags in production. Either use `Always` or use immutable SHA-based tags.

### Bug 3 — CI/CD Job 4 Updating Wrong Path
**Error:**
```
Job 4 succeeds but ArgoCD never deploys new image
Old pods keep running after every push
```
**Root Cause:**
Job 4 in `ci.yml` was running `sed` on `k8s/backend/deployment.yaml` — a file path that no longer existed because Phase 7 replaced raw manifests with Helm. The `sed` command silently succeeded (no error on non-existent file) but changed nothing.

**Fix:**
Updated `ci.yml` Job 4 to target the correct file:
```yaml
run: |
  sed -i "s|tag:.*|tag: ${GITHUB_SHA::8}|g" helm/values.yaml
```
**Lesson:** When switching from raw K8s manifests to Helm, update ALL references — including CI/CD pipeline paths. Silent `sed` failures are the worst kind of bug.

### Bug 4 — ArgoCD Watching Wrong Directory
**Error:**
```
ArgoCD shows Synced but app never updates
New image tags from CI/CD are ignored
```
**Root Cause:**
ArgoCD Application was configured to watch `k8s/` directory (from Phase 5 setup). After Phase 7, all deployments moved to `helm/`. ArgoCD was watching a directory that CI/CD no longer updated.

**Fix:**
```bash
kubectl patch application gitops-taskmanager -n argocd --type='json' -p='[
  {"op": "replace", "path": "/spec/source/path", "value": "helm"},
  {"op": "add", "path": "/spec/source/helm", "value": {"valueFiles": ["values.yaml"]}}
]'
```
**Lesson:** GitOps path discipline — ArgoCD sync path and CI/CD update path must always point to the same location. Any mismatch silently breaks the entire GitOps loop.

### Bug 5 — ArgoCD repo-server Crashing After Kind Restart
**Error:**
```
argocd-repo-server: CrashLoopBackOff
argocd-applicationset-controller: CrashLoopBackOff
```
**Root Cause:**
Same as Phase 5 Bug 2 — pods restart in wrong order on kind+WSL2. Known limitation.

**Fix:**
```bash
kubectl rollout restart deployment -n argocd
```
**Lesson:** Add this to your kind cluster startup checklist. Not an issue on EKS.

---

## Phase 9 — Terraform + AWS EKS

### Bug 1 — Kubernetes 1.29 AMI Not Available
**Error:**
```
Error: error creating EKS Node Group: InvalidParameterException: 
No nodegroup stack found. AMI with id ami-xxx not found.
```
**Root Cause:**
AWS removed the EKS 1.29 AMI from `ap-south-1` region. AWS only allows one minor version jump at a time when selecting node AMIs.

**Fix:**
Changed `variables.tf`:
```hcl
variable "kubernetes_version" {
  default = "1.30"  # Changed from "1.29"
}
```
**Lesson:** AWS periodically removes old AMIs. Check available versions with `aws eks describe-addon-versions`. Always use the latest available stable version.

### Bug 2 — Namespace Ownership Conflict
**Error:**
```
INSTALLATION FAILED: Unable to continue with install: Namespace "taskmanager" 
in namespace "" exists and cannot be imported into the current release: 
invalid ownership metadata; annotation validation error: 
key "meta.helm.sh/release-namespace" must equal "taskmanager": current value is "default"
```
**Root Cause:**
A previous Helm install created the `taskmanager` namespace with ownership metadata pointing to a different release or namespace. Helm strictly validates these annotations and refuses to take ownership of namespaces it didn't create with the current configuration.

**Fix:**
```bash
kubectl delete namespace taskmanager
# Wait for deletion, then:
helm install taskmanager helm/ -f helm/values.yaml
# No -n flag. No --create-namespace flag.
# Let the chart's namespace.yml template handle creation.
```
**Lesson:** When the Helm chart has a `namespace.yml` template, it creates the namespace with correct ownership annotations. Using `--create-namespace` or pre-creating the namespace manually causes ownership conflicts.

### Bug 3 — PVC Stuck in Pending — Wrong StorageClass
**Error:**
```
kubectl get pvc -n taskmanager
NAME                    STATUS    VOLUME   CAPACITY   STORAGECLASS
postgres-data           Pending                       standard
```
**Root Cause:**
`values.yaml` had `storageClassName: standard` which is the StorageClass name in kind clusters. EKS uses `gp2` (AWS EBS General Purpose SSD). The `standard` StorageClass doesn't exist on EKS, so no volume could be provisioned.

**Fix:**
```bash
sed -i 's/storageClassName: standard/storageClassName: gp2/' helm/values.yaml
```
**Lesson:** StorageClass names differ between environments. kind uses `standard`. EKS uses `gp2`. Always parameterize StorageClass in `values.yaml` and override per environment.

### Bug 4 — EBS CSI Driver Missing — PVC Never Bound
**Error:**
```
Events:
  Warning  ProvisioningFailed  
  waiting for a volume to be created by the external provisioner 'ebs.csi.aws.com'
```
**Root Cause:**
The EBS CSI Driver is a separate Kubernetes addon that must be explicitly installed on EKS. Without it, no component can create AWS EBS volumes dynamically. It is NOT installed by default on EKS clusters.

**Fix:**
```bash
# Install eksctl
curl --silent --location "https://github.com/eksctl-io/eksctl/releases/latest/download/eksctl_Linux_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin

# Create OIDC provider
eksctl utils associate-iam-oidc-provider \
  --region ap-south-1 \
  --cluster gitops-taskmanager-eks \
  --approve

# Install EBS CSI Driver addon
eksctl create addon \
  --name aws-ebs-csi-driver \
  --cluster gitops-taskmanager-eks \
  --region ap-south-1 \
  --force
```
Permanently fixed by adding to `eks.tf`:
```hcl
resource "aws_eks_addon" "ebs_csi_driver" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "aws-ebs-csi-driver"
  depends_on   = [aws_iam_role_policy_attachment.ebs_csi_policy]
}
```
**Lesson:** EBS CSI Driver is mandatory for PVC provisioning on EKS. Always add it to `eks.tf` before running `terraform apply`. Missing it wastes significant debugging time.

### Bug 5 — PostgreSQL initdb Failed — lost+found Directory
**Error:**
```
initdb: error: directory "/var/lib/postgresql/data" exists but is not empty
It contains a lost+found directory
HINT: If you want to create a new database system, either remove or empty the directory
```
**Root Cause:**
When AWS EBS volumes are formatted with ext4 filesystem, they automatically create a `lost+found` directory at the root. PostgreSQL's `initdb` command refuses to initialize in any non-empty directory — even if the only file is `lost+found`.

**Fix:**
Added `subPath` to the postgres deployment volumeMount:
```yaml
volumeMounts:
  - name: postgres-storage
    mountPath: /var/lib/postgresql/data
    subPath: postgres-data  # Use subdirectory, not EBS root
```
This makes PostgreSQL use `/var/lib/postgresql/data/postgres-data` as its data directory — a subdirectory inside the EBS volume, completely avoiding `lost+found`.

**Lesson:** Always use `subPath` when mounting EBS volumes into PostgreSQL (or any database that uses initdb). This is mandatory for EKS+EBS deployments.

### Bug 6 — WSL2 Lost DNS Connection to EKS API Server
**Error:**
```
Unable to connect to the server: 
dial tcp: lookup ABC123.gr7.ap-south-1.eks.amazonaws.com: i/o timeout
```
**Root Cause:**
WSL2's DNS resolver (`systemd-resolved`) timed out during a long session. This is a known WSL2 networking issue that happens intermittently. The EKS cluster was running fine on AWS — purely a local DNS problem.

**Fix Option 1:**
```bash
sudo systemctl restart systemd-resolved
```
**Fix Option 2 (if Option 1 fails):**
Open PowerShell as Administrator:
```powershell
wsl --shutdown
```
Reopen WSL2 terminal and reconnect.

**Lesson:** If kubectl suddenly can't reach EKS but AWS Console shows the cluster is fine, it's always a WSL2 DNS issue. Restart `systemd-resolved` first.

### Bug 7 — Terraform State Lock Stuck
**Error:**
```
Error: Error acquiring the state lock
Lock Info:
  ID: 7b90490e-453e-fac8-b4ca-61a83fec3c75
  Operation: OperationTypeApply
  Who: shravan@SHRAVANVM
  Created: 2026-04-07 ...
```
**Root Cause:**
A previous `terraform apply` was interrupted (Ctrl+C or terminal crash) before it could release the DynamoDB state lock. The lock entry remained in the DynamoDB table, blocking all subsequent Terraform operations.

**Fix:**
```bash
terraform force-unlock 7b90490e-453e-fac8-b4ca-61a83fec3c75
# Then:
terraform destroy -lock=false
```
**Lesson:** Always let `terraform apply` or `terraform destroy` complete naturally. If interrupted, use `force-unlock` with the lock ID shown in the error. The lock ID is always printed in the error message.

### Bug 8 — VPC Deletion Failed — ELB Still Attached
**Error:**
```
Error: deleting EC2 VPC: DependencyViolation: 
The vpc 'vpc-076e4f6ce4daaf65a' has dependencies and cannot be deleted.
```
**Root Cause:**
The AWS Elastic Load Balancer was created by Kubernetes (when Nginx Ingress Controller's LoadBalancer service was deployed) — not by Terraform. So Terraform had no knowledge of it and couldn't delete it. The ELB remained attached to the VPC subnets, blocking VPC deletion.

**Fix (manual):**
```bash
# Find the ELB
aws elb describe-load-balancers --region ap-south-1 \
  --query 'LoadBalancerDescriptions[*].LoadBalancerName' --output text

# Delete it
aws elb delete-load-balancer \
  --load-balancer-name a10c1e8f5a05744719d829b8b854ca1a \
  --region ap-south-1

# Wait 30 seconds, then:
terraform destroy
```
**Fix (permanent — via destroy.sh):**
Always run `helm uninstall ingress-nginx -n ingress-nginx` BEFORE `terraform destroy`. Kubernetes then deletes the ELB automatically, leaving VPC free to delete.

**Lesson:** Resources created by Kubernetes (like ELBs) are invisible to Terraform. Always clean up Kubernetes resources before running `terraform destroy`.

### Bug 9 — Ingress host: taskmanager.local → 404 on ELB
**Error:**
```
curl http://[ELB-hostname]/health
→ 404 Not Found (nginx)
```
**Root Cause:**
The Ingress was configured with `host: taskmanager.local` (for kind + `/etc/hosts` mapping). On EKS, nginx receives requests with the ELB hostname as the HTTP `Host` header. No Ingress rule matched this hostname, so nginx returned 404.

**Fix:**
Changed `helm/values.yaml`:
```yaml
ingress:
  host: ""  # Empty = accept all hostnames
```
**Lesson:** `taskmanager.local` only works with kind + `/etc/hosts`. On cloud deployments, use an empty host (accept all) or a real domain name.

### Bug 10 — rewrite-target: / Stripping All Path Prefixes
**Error:**
```
curl http://[ELB]/api/health
→ {"success": false, "message": "Route GET / not found"}
```
**Root Cause:**
The annotation `nginx.ingress.kubernetes.io/rewrite-target: /` was rewriting every incoming path to `/` before forwarding to the backend. So `/api/auth/login` arrived at Express as `/` — a route that doesn't exist.

**Fix:**
Removed the `rewrite-target` annotation entirely from `helm/templates/ingress.yml`. Without it, nginx forwards the full original path unchanged.

**Lesson:** `rewrite-target: /` is only needed when your backend serves from root and you want to strip a prefix (e.g., strip `/app` from `/app/api/login`). If your Express routes already include `/api`, don't use rewrite-target.

---

## Phase 10 — ArgoCD + Monitoring on EKS

### Bug 1 — ArgoCD Install — 256KB Annotation Limit
**Error:**
```
The CustomResourceDefinition "applicationsets.argoproj.io" is invalid: 
metadata.annotations: Too long: must have at most 262144 bytes
```
**Root Cause:**
ArgoCD's `install.yaml` is a very large manifest file with 100+ Kubernetes resources. When `kubectl apply` applies it client-side, it stores the entire manifest in a `last-applied-configuration` annotation on each resource. This annotation has a 256KB size limit in Kubernetes. ArgoCD's CRDs exceed this limit.

**Fix:**
Added `--server-side --force-conflicts` flags:
```bash
kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml \
  --server-side \
  --force-conflicts
```
`--server-side` moves processing to the Kubernetes API server, which doesn't use the annotation storage mechanism.

**Lesson:** Always use `--server-side` when applying large manifests like ArgoCD. This flag bypasses the annotation size limit entirely.

### Bug 2 — deploy.sh Exiting on ArgoCD Warning
**Error:**
```
Script exits after ArgoCD install with no clear error
deploy.sh stops mid-way
```
**Root Cause:**
The script had `set -e` (exit on any error). ArgoCD's install outputs some warnings that `kubectl` treats as non-zero exit codes in certain cases. `set -e` then exits the entire script.

**Fix:**
Added error suppression for idempotent commands:
```bash
helm repo add ingress-nginx https://... 2>/dev/null || true
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
```
`2>/dev/null || true` — suppress errors and continue even if command "fails" (e.g., repo already added).

**Lesson:** In deployment scripts, distinguish between real failures (should exit) and expected non-zero exits (should continue). Use `|| true` for idempotent operations.

### Bug 3 — ServiceMonitor Label Mismatch — No Metrics in Grafana
**Error:**
```
Grafana custom dashboard shows "No data" for all HTTP metrics panels
Backend Pod Memory Usage works fine
```
**Root Cause:**
The `ServiceMonitor` was configured to select services with label `app: backend`. But Helm-generated services have labels like `app.kubernetes.io/component: backend`. The labels didn't match, so Prometheus never scraped the backend's `/metrics` endpoint.

**Fix:**
```bash
kubectl patch servicemonitor backend-servicemonitor -n monitoring \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/selector/matchLabels", 
  "value": {"app.kubernetes.io/component": "backend"}}]'
```
Also permanently fixed in `monitoring/backend-servicemonitor.yml`:
```yaml
selector:
  matchLabels:
    app.kubernetes.io/component: backend  # Not "app: backend"
```
**Lesson:** Helm generates labels following the `app.kubernetes.io/` convention. ServiceMonitor selectors must use the same convention. Check actual service labels with `kubectl get svc -n taskmanager --show-labels` before writing ServiceMonitor selectors.

### Bug 4 — ServiceMonitor Applied Before Namespace Existed
**Error:**
```
kubectl apply -f monitoring/backend-servicemonitor.yml
→ Error from server (NotFound): namespaces "taskmanager" not found
```
**Root Cause:**
In `deploy.sh`, the ServiceMonitor was applied immediately after ArgoCD was told to sync. But ArgoCD hadn't finished creating the `taskmanager` namespace yet when the `kubectl apply` ran.

**Fix:**
Added a wait before applying the ServiceMonitor:
```bash
echo "Waiting 120 seconds for ArgoCD to deploy the app..."
sleep 120
# Then apply ServiceMonitor
kubectl apply -f monitoring/backend-servicemonitor.yml
```
**Lesson:** ArgoCD sync is asynchronous. Always wait for ArgoCD to finish deploying before applying resources that depend on namespaces ArgoCD creates.

---

## Summary — Errors by Category

| Category | Count | Most Common Fix |
|---|---|---|
| Image/Registry Issues | 4 | Check exact Docker Hub image names |
| Kubernetes Config | 6 | Use dynamic names via Helm helpers |
| AWS/EKS Specific | 7 | EBS CSI Driver + gp2 + subPath |
| CI/CD Pipeline | 4 | Check file paths + permissions |
| ArgoCD | 5 | Restart deployments + check sync path |
| Networking | 3 | WSL2 DNS + ELB deletion order |
| Terraform | 3 | State locks + destroy order |
| **Total** | **32** | **Real bugs, real fixes** |

---

## Key Takeaways

1. **Local ≠ Cloud** — kind and EKS behave differently for storage, networking, and pull policies
2. **Helm fullnames matter** — always use `{{ include "taskmanager.fullname" . }}` for service references
3. **Destroy order matters** — uninstall Kubernetes resources before `terraform destroy`
4. **EBS always needs subPath** — mandatory for any database using initdb on EKS
5. **EBS CSI Driver is not default** — always add it to eks.tf before applying
6. **Silent failures are the worst** — `sed` on non-existent files, wrong ArgoCD watch path
7. **WSL2 has quirks** — right-click to paste, restart systemd-resolved for DNS issues
8. **GitOps paths must match** — CI/CD update path = ArgoCD watch path, always
