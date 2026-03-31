# CLAUDE.md — GitOps Task Manager

## 👤 About Me
- My name is **Shravan**
- I am an **aspiring DevOps Engineer** (fresher level)
- This is my **portfolio project** to demonstrate end-to-end DevOps skills
- **Always explain steps simply, step by step**
- **Always tell me which directory to run commands in**
- **If skipping any file, tell me clearly and why**
- **Diagnose errors from a DevOps perspective**

---

## 📁 Project Overview
**GitOps Task Manager** — A production-grade full-stack Task Manager app with complete DevOps infrastructure.

### Tech Stack
| Layer | Technology |
|---|---|
| Backend | Node.js + Express + PostgreSQL + JWT Auth |
| Frontend | React + Vite + React Router |
| Containerization | Docker + Docker Compose |
| Orchestration | Kubernetes (kind locally, EKS on AWS) |
| GitOps | ArgoCD |
| CI/CD | GitHub Actions |
| Security Scanning | Trivy |
| Package Manager (K8s) | Helm |
| Monitoring | Prometheus + Grafana |
| IaC | Terraform |
| Container Registry | Docker Hub |
| Cloud | AWS (EKS, EBS, VPC) |

---

## 📁 Project Directory Structure
```
gitops-taskmanager/
│
├── backend/
│   ├── src/
│   │   ├── config/index.js
│   │   ├── db/index.js
│   │   ├── middleware/auth.js
│   │   ├── middleware/errorHandler.js
│   │   ├── routes/auth.js
│   │   ├── routes/tasks.js
│   │   └── index.js
│   ├── .env.example
│   ├── .dockerignore
│   ├── Dockerfile             ← multi-stage build, non-root user
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/axios.js
│   │   ├── components/Navbar.jsx
│   │   ├── components/TaskCard.jsx
│   │   ├── components/TaskForm.jsx
│   │   ├── pages/Dashboard.jsx
│   │   ├── pages/Login.jsx
│   │   ├── pages/Register.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── index.html
│   ├── nginx.conf
│   ├── vite.config.js
│   ├── .dockerignore
│   ├── Dockerfile             ← multi-stage build, Nginx to serve
│   └── package.json
│
├── k8s/
│   ├── namespaces/namespaces.yaml
│   ├── backend/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── configmap.yaml
│   │   └── hpa.yaml
│   ├── frontend/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   ├── postgres/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── pvc.yaml
│   │   └── configmap.yaml
│   ├── secrets/secrets.yaml
│   ├── ingress/ingress.yaml
│   └── argocd/application.yaml
│
├── helm/
│   ├── Chart.yaml
│   ├── values.yaml
│   ├── values-dev.yaml
│   ├── values-prod.yaml
│   └── templates/
│       ├── backend-deployment.yaml
│       ├── frontend-deployment.yaml
│       ├── postgres-deployment.yaml
│       └── ingress.yaml
│
├── infra/terraform/
│   ├── backend.tf             ← remote state on S3 + DynamoDB
│   ├── vpc.tf
│   ├── eks.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── main.tf
│
├── monitoring/
│   └── grafana-dashboard.json
│
├── .github/workflows/
│   └── ci.yml
│
└── README.md
```

---

## ✅ Progress Tracker

### PHASE 0 — Source Code ✅ COMPLETED
- [x] Backend: Node.js + Express REST API
- [x] JWT Authentication (register, login, me)
- [x] Full CRUD for Tasks and Categories
- [x] PostgreSQL with auto table creation
- [x] Input validation and error handling
- [x] Health check endpoint (`/health`)
- [x] Frontend: React + Vite + React Router
- [x] Login, Register, Dashboard pages
- [x] TaskCard, TaskForm, Navbar components
- [x] Axios with JWT auto-attach interceptor
- [x] Search with debounce
- [x] Filter by priority, category, status
- [x] Config files: vite.config.js, nginx.conf, .env.example
- [x] Tested locally (PostgreSQL via Docker, backend port 5000, frontend port 3000)

### PHASE 1 — Dockerfiles ✅ COMPLETED
- [x] backend/Dockerfile (multi-stage build, non-root user)
- [x] frontend/Dockerfile (multi-stage build, Nginx)
- [x] backend/.dockerignore
- [x] frontend/.dockerignore
- [x] Tested: docker build both images locally
- [x] Tested: docker run both containers and verified

### PHASE 2 — Docker Compose ✅ COMPLETED
- [x] docker-compose.yml (backend + frontend + postgres + volumes + network)
- [x] Tested: docker compose up → full app running

### PHASE 3 — Kubernetes YAML Manifests ✅ COMPLETED
- [x] k8s/namespaces/namespaces.yaml
- [x] k8s/backend/deployment.yaml
- [x] k8s/backend/service.yaml
- [x] k8s/backend/configmap.yaml
- [x] k8s/backend/hpa.yaml
- [x] k8s/frontend/deployment.yaml
- [x] k8s/frontend/service.yaml
- [x] k8s/postgres/deployment.yaml
- [x] k8s/postgres/service.yaml
- [x] k8s/postgres/pvc.yaml
- [x] k8s/postgres/configmap.yaml
- [x] k8s/secrets/secrets.yaml
- [x] k8s/ingress/ingress.yaml

### PHASE 4 — Local Kubernetes with Kind ✅ COMPLETED
- [x] Created kind cluster locally
- [x] Applied all K8s manifests
- [x] Installed Nginx Ingress Controller
- [x] Tested app running on local K8s cluster
- [x] Verified pods, services, ingress all healthy

### PHASE 5 — ArgoCD (GitOps) ✅ COMPLETED
- [x] Installed ArgoCD on kind cluster
- [x] k8s/argocd/application.yaml
- [x] Connected ArgoCD to GitHub repo
- [x] Tested: push to Git → ArgoCD auto deploys
- [x] GitOps flow verified end to end

### PHASE 6 — GitHub Actions CI/CD Pipeline ✅ COMPLETED
- [x] .github/workflows/ci.yml with 4 jobs:
  - Run Tests (9s)
  - Build and Trivy Scan (51s)
  - Push to Docker Hub (33s)
  - Update K8s Image Tags (4s)
- [x] GitHub Secrets added (DOCKER_USERNAME, DOCKER_PASSWORD, etc.)
- [x] Full pipeline tested end to end — Status: SUCCESS
- [x] Fixed: Upgraded actions/checkout@v4 → v5 (Node.js 22, no deprecation warning)
- **Docker Hub username:** shravanmungarwadi

### PHASE 7 — Helm Chart ⬜ NEXT UP
- [ ] helm/Chart.yaml
- [ ] helm/values.yaml
- [ ] helm/values-dev.yaml
- [ ] helm/values-prod.yaml
- [ ] helm/templates/backend-deployment.yaml
- [ ] helm/templates/frontend-deployment.yaml
- [ ] helm/templates/postgres-deployment.yaml
- [ ] helm/templates/ingress.yaml
- [ ] Test: helm install on kind cluster

### PHASE 8 — Monitoring (Prometheus + Grafana) ⬜ PENDING
- [ ] Install Prometheus on K8s cluster
- [ ] Install Grafana on K8s cluster
- [ ] monitoring/grafana-dashboard.json
- [ ] Configure backend metrics scraping
- [ ] Build Grafana dashboard
- [ ] Test: view live metrics

### PHASE 9 — Terraform + AWS EKS ⬜ PENDING
- [ ] infra/terraform/backend.tf (remote state on S3 + DynamoDB)
- [ ] infra/terraform/vpc.tf
- [ ] infra/terraform/eks.tf
- [ ] infra/terraform/variables.tf
- [ ] infra/terraform/outputs.tf
- [ ] infra/terraform/main.tf
- [ ] terraform init → plan → apply
- [ ] Deploy full app on EKS
- [ ] Configure ArgoCD on EKS
- [ ] Full production deployment verified

### PHASE 10 — Final Polish ⬜ PENDING
- [ ] README.md (architecture diagram, setup guide)
- [ ] Review all files
- [ ] Push everything to GitHub
- [ ] Portfolio ready

---

## 🔑 Key Configuration Details

### Ports
| Service | Local Dev Port | Docker Port |
|---|---|---|
| Backend | 5000 | 5000 |
| Frontend | 3000 | 80 |
| PostgreSQL | 5432 | 5432 |

### Environment Variables (backend)
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=taskmanager
DB_USER=postgres
DB_PASSWORD=<secret>
JWT_SECRET=<secret>
PORT=5000
```

### GitHub Repo
```
https://github.com/shravanmungarwadi/GitOps-Task-Manager
```

### Docker Hub
```
https://hub.docker.com/u/shravanmungarwadi
Images: shravanmungarwadi/gitops-taskmanager-backend
        shravanmungarwadi/gitops-taskmanager-frontend
```

---

## 🚀 Common Commands Reference

### Local Dev
```bash
# Start PostgreSQL
docker run -d --name postgres -e POSTGRES_PASSWORD=password -p 5432:5432 postgres

# Start Backend (from /backend)
npm run dev

# Start Frontend (from /frontend)
npm run dev
```

### Docker
```bash
# Build images (from project root)
docker build -t shravanmungarwadi/gitops-taskmanager-backend ./backend
docker build -t shravanmungarwadi/gitops-taskmanager-frontend ./frontend

# Full stack with compose (from project root)
docker compose up --build
docker compose down
```

### Kubernetes (kind)
```bash
# Create kind cluster
kind create cluster --name gitops-taskmanager

# Apply all manifests (from project root)
kubectl apply -f k8s/namespaces/
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/
kubectl apply -f k8s/postgres/
kubectl apply -f k8s/ingress/

# Check status
kubectl get pods -n taskmanager
kubectl get svc -n taskmanager
kubectl get ingress -n taskmanager
```

### ArgoCD
```bash
# Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Port forward ArgoCD UI
kubectl port-forward svc/argocd-server -n argocd 8080:443
```

### Helm (Phase 7)
```bash
# Install app via Helm (from project root)
helm install gitops-taskmanager ./helm -f helm/values-dev.yaml

# Upgrade
helm upgrade gitops-taskmanager ./helm -f helm/values-dev.yaml

# Uninstall
helm uninstall gitops-taskmanager
```

### Terraform (Phase 9)
```bash
# From infra/terraform/
terraform init
terraform plan
terraform apply
terraform destroy
```

---

## ⚠️ Known Issues / Notes
- `actions/checkout@v4` → upgraded to `v5` to fix Node.js 20 deprecation warning
- When pushing to GitHub, if rejected: run `git stash` → `git pull origin main --rebase` → `git stash pop` → `git push origin main`
- Frontend proxies `/api` requests to backend via `vite.config.js` in dev mode; in production Nginx handles this via `nginx.conf`

---

## 📌 Resume This Project
**Current status: Phase 6 COMPLETE. Start Phase 7 — Helm Chart.**

When resuming, tell Claude:
> "I am Shravan, a fresher DevOps Engineer. I am working on my GitOps Task Manager portfolio project. Phases 0–6 are complete. Please help me with Phase 7 — Helm Chart. Treat me as a beginner, explain step by step, and always tell me which directory to run commands in."
