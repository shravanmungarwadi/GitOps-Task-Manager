# 🏗️ Architecture Deep Dive

Complete technical architecture of the GitOps Task Manager — every component, every connection, every decision explained.

---

## Table of Contents

- [High Level Overview](#high-level-overview)
- [Application Layer](#application-layer)
- [Containerization Layer](#containerization-layer)
- [Kubernetes Layer](#kubernetes-layer)
- [GitOps Layer](#gitops-layer)
- [CI/CD Layer](#cicd-layer)
- [Infrastructure Layer](#infrastructure-layer)
- [Monitoring Layer](#monitoring-layer)
- [Networking Layer](#networking-layer)
- [Security Decisions](#security-decisions)
- [Data Flow](#data-flow)

---

## High Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     DEVELOPER WORKFLOW                           │
│                                                                  │
│   Write Code → git push → CI/CD runs → ArgoCD deploys → Live   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GITHUB REPOSITORY                             │
│                                                                  │
│   Source Code + Helm Charts + Terraform + Monitoring Config     │
│   Git = Single Source of Truth for everything                   │
└─────────────────────────────────────────────────────────────────┘
          │                              │
          │ CI/CD                        │ GitOps
          ▼                              ▼
┌──────────────────┐          ┌──────────────────────┐
│  GitHub Actions  │          │       ArgoCD          │
│  4-job pipeline  │          │  Watches GitHub repo  │
│  Tests → Scan    │          │  Auto-deploys on      │
│  Build → Push    │          │  every commit         │
└──────────────────┘          └──────────────────────┘
          │                              │
          │ Docker images                │ Helm deploy
          ▼                              ▼
┌──────────────────┐          ┌──────────────────────┐
│   Docker Hub     │          │    AWS EKS Cluster    │
│   Image Registry │          │    Kubernetes 1.30    │
└──────────────────┘          └──────────────────────┘
                                         │
                              ┌──────────┴──────────┐
                              │                     │
                    ┌─────────▼──────┐   ┌─────────▼──────┐
                    │   Application  │   │   Monitoring   │
                    │   Namespace    │   │   Namespace    │
                    │  taskmanager   │   │   monitoring   │
                    └────────────────┘   └────────────────┘
```

---

## Application Layer

### Backend — Node.js + Express

The backend is a RESTful API built with Node.js and Express.

```
backend/src/
├── config/index.js       # Environment variables, JWT config
├── db/index.js           # PostgreSQL connection pool
├── middleware/
│   ├── auth.js           # JWT verification middleware
│   └── errorHandler.js   # Global error handler
├── routes/
│   ├── auth.js           # POST /api/auth/register, login, me
│   └── tasks.js          # CRUD /api/tasks + /api/categories
└── index.js              # Express app, /health, /metrics
```

**API Endpoints:**

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Create new account | No |
| POST | `/api/auth/login` | Login, get JWT token | No |
| GET | `/api/auth/me` | Get current user | Yes |
| GET | `/api/tasks` | List all tasks | Yes |
| POST | `/api/tasks` | Create task | Yes |
| PUT | `/api/tasks/:id` | Update task | Yes |
| DELETE | `/api/tasks/:id` | Delete task | Yes |
| GET | `/api/categories` | List categories | Yes |
| POST | `/api/categories` | Create category | Yes |
| GET | `/health` | Health check | No |
| GET | `/metrics` | Prometheus metrics | No |

**Key Technical Decisions:**
- JWT tokens stored in memory (not cookies) — simpler for portfolio
- `bcryptjs` for password hashing — never store plain text passwords
- `express-validator` for input validation — prevents injection attacks
- Connection pooling with `pg` — efficient database connections
- Auto table creation on startup — database schema managed in code

### Frontend — React + Vite

```
frontend/src/
├── api/axios.js          # Axios instance with JWT interceptor
├── components/
│   ├── Navbar.jsx        # Navigation with logout
│   ├── TaskCard.jsx      # Individual task display
│   └── TaskForm.jsx      # Create/edit task form
├── pages/
│   ├── Login.jsx         # Login page
│   ├── Register.jsx      # Registration page
│   └── Dashboard.jsx     # Main app page
├── App.jsx               # Routing with React Router
└── main.jsx              # Entry point
```

**Key Technical Decisions:**
- Vite for fast development and optimized production builds
- React Router for client-side routing
- Axios interceptor auto-attaches JWT to every request
- Search with debounce — prevents excessive API calls
- Nginx serves production build — not Node.js

### Database — PostgreSQL

Tables created automatically on backend startup:

```sql
users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255),
  created_at TIMESTAMP
)

categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP
)

tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  description TEXT,
  priority VARCHAR(10),     -- low, medium, high
  status VARCHAR(20),       -- pending, in_progress, completed
  due_date DATE,
  completed BOOLEAN,
  user_id INTEGER REFERENCES users(id),
  category_id INTEGER REFERENCES categories(id),
  created_at TIMESTAMP
)
```

---

## Containerization Layer

### Multi-Stage Docker Builds

Both images use multi-stage builds to minimize final image size.

**Backend Dockerfile stages:**
```
Stage 1: builder
  - node:18-alpine
  - Install ALL dependencies (dev + prod)
  - Build if needed

Stage 2: production
  - node:18-alpine (fresh, clean)
  - Copy only node_modules from builder
  - Copy source code
  - Run as non-root user (uid 1001)
  - EXPOSE 5000
```

**Frontend Dockerfile stages:**
```
Stage 1: builder
  - node:18-alpine
  - npm install + npm run build
  - Produces /app/dist folder

Stage 2: production
  - nginx:alpine (fresh, tiny)
  - Copy /app/dist from builder
  - Copy custom nginx.conf
  - EXPOSE 80
```

**Why non-root users?**
Running containers as root is a security risk. If a container is compromised, the attacker gets root access to the host. Non-root users limit the blast radius.

### Docker Compose (Local Development)

```yaml
services:
  postgres:   # Official postgres:15 image, named volume
  backend:    # Built from ./backend, depends on postgres
  frontend:   # Built from ./frontend, depends on backend
```

All on same network — services reach each other by service name.

---

## Kubernetes Layer

### Namespace Strategy

```
Namespace: taskmanager    ← Application workloads
Namespace: argocd         ← GitOps controller
Namespace: monitoring     ← Prometheus + Grafana
Namespace: ingress-nginx  ← Nginx Ingress Controller
```

Namespaces provide isolation — monitoring can't accidentally affect application.

### Helm Chart Structure (18 files)

```
helm/
├── Chart.yaml                      # Chart metadata
├── values.yaml                     # Default values (production)
├── values-dev.yml                  # Dev overrides
├── values-prod.yml                 # Prod overrides
└── templates/
    ├── _helpers.tpl                # Reusable template functions
    ├── namespace.yml               # Creates taskmanager namespace
    ├── secrets.yml                 # DB password, JWT secret
    ├── backend-configmap.yml       # Backend env vars
    ├── backend-deployment.yml      # Backend pods (2 replicas)
    ├── backend-service.yml         # ClusterIP service
    ├── backend-hpa.yml             # HPA (2-5 replicas)
    ├── frontend-deployment.yml     # Frontend pods (2 replicas)
    ├── frontend-service.yml        # ClusterIP service
    ├── frontend-nginx-configmap.yml# Nginx config with dynamic hostname
    ├── postgres-deployment.yml     # PostgreSQL pod (1 replica)
    ├── postgres-service.yml        # ClusterIP service
    ├── postgres-pvc.yml            # PersistentVolumeClaim (1Gi gp2)
    └── ingress.yml                 # Nginx Ingress routing rules
```

**Key Helm Decisions:**

`_helpers.tpl` generates consistent names:
```
Release: taskmanager + Chart: gitops-taskmanager
= fullname: taskmanager-gitops-taskmanager
```

All service names use this fullname — so `DB_HOST` in ConfigMap always matches the actual PostgreSQL service name. No hardcoding.

### HPA (Horizontal Pod Autoscaler)

```
Backend: min=2, max=5 replicas
  - Scale up when CPU > 70%
  - Scale down when CPU < 70%

Important rule: backend.replicas must always equal hpa.minReplicas
  - If replicas=2 but minReplicas=1, ArgoCD would fight HPA
  - Keep them equal to avoid conflict loops
```

### Persistent Storage

PostgreSQL uses AWS EBS (gp2) for persistent storage:

```yaml
PersistentVolumeClaim:
  storageClassName: gp2      # AWS EBS General Purpose SSD
  storage: 1Gi
  accessModes: ReadWriteOnce # One node at a time (correct for EBS)

volumeMount:
  mountPath: /var/lib/postgresql/data
  subPath: postgres-data     # CRITICAL: avoids lost+found conflict
```

**Why subPath?**
AWS EBS volumes create a `lost+found` directory at the root when formatted. PostgreSQL's `initdb` refuses to initialise in a non-empty directory. `subPath: postgres-data` makes PostgreSQL use a subdirectory, avoiding this conflict.

---

## GitOps Layer

### ArgoCD Application

```yaml
source:
  repoURL: https://github.com/shravanmungarwadi/GitOps-Task-Manager.git
  path: helm                    # Watch the helm/ directory
  helm:
    valueFiles: [values.yaml]   # Use production values

destination:
  namespace: taskmanager        # Deploy to this namespace

syncPolicy:
  automated:
    prune: true                 # Delete resources removed from Git
    selfHeal: true              # Revert manual changes automatically
```

**How ArgoCD GitOps Loop Works:**

```
Every 3 minutes (or on webhook):
  ArgoCD reads GitHub repo helm/ directory
          │
          ▼
  Compares desired state (GitHub) vs actual state (EKS)
          │
          ├── Same? → Do nothing
          │
          └── Different? → Apply the diff
                  │
                  ▼
          Helm install/upgrade runs internally
                  │
                  ▼
          EKS matches GitHub ✅
```

**selfHeal = true** means:
- Someone manually deletes a pod → ArgoCD recreates it
- Someone manually scales replicas → ArgoCD reverts to Git values
- Git is always authoritative

---

## CI/CD Layer

### GitHub Actions Workflow

```yaml
on:
  push:
    branches: [main]    # Trigger on every push to main

jobs:
  test → scan → build-push → update-helm
```

**Job 4 — Image Tag Update:**

```bash
# Updates helm/values.yaml with new image SHA
sed -i "s|tag:.*|tag: ${GITHUB_SHA::8}|g" helm/values.yaml
git commit -m "ci: update image tag to ${GITHUB_SHA::8}"
git push
```

This commit triggers ArgoCD → new image deployed automatically.

**Why SHA tags instead of :latest?**

`:latest` is ambiguous — you can't tell which code version is running.
`sha-abc1234` is traceable — every deployment links to an exact commit.

**Git Rebase Discipline:**

```bash
# Always this order (Job 4 might have pushed ahead):
git add .
git commit -m "..."
git pull --rebase origin main   # Get Job 4's image tag commit
git push origin main
```

---

## Infrastructure Layer

### VPC Design

```
VPC: 10.0.0.0/16 (65,536 IPs)
│
├── Public Subnet AZ-a: 10.0.1.0/24   ← ELB lives here
├── Public Subnet AZ-b: 10.0.2.0/24   ← ELB lives here
├── Private Subnet AZ-a: 10.0.3.0/24  ← Worker nodes live here
└── Private Subnet AZ-b: 10.0.4.0/24  ← Worker nodes live here

Internet Gateway → Public subnets → Internet
NAT Gateway → Private subnets → Internet (outbound only)
```

**Why private subnets for nodes?**
Worker nodes in private subnets cannot be directly accessed from the internet. They can still pull Docker images (via NAT Gateway) but are not exposed to the public internet. More secure.

### EKS Configuration

```hcl
aws_eks_cluster:
  version: "1.30"
  endpoint_public_access: true    # kubectl from laptop works

aws_eks_node_group:
  instance_types: ["t3.medium"]  # 2 vCPU, 4GB RAM
  desired_size: 2                 # 2 nodes across 2 AZs
  min_size: 1
  max_size: 3

aws_eks_addon "aws-ebs-csi-driver":  # CRITICAL - for PVC provisioning
  depends_on: [OIDC provider + IAM role]
```

**Why EBS CSI Driver is required:**
Without it, PersistentVolumeClaims using `gp2` StorageClass stay in `Pending` state forever. The EBS CSI Driver is the bridge between Kubernetes PVCs and AWS EBS volumes.

### Terraform Remote State

```
S3 bucket: gitops-taskmanager-tfstate
  └── eks/terraform.tfstate    ← All resource IDs stored here

DynamoDB: gitops-taskmanager-tflock
  └── LockID entry             ← Prevents concurrent applies
```

If two people run `terraform apply` simultaneously, the second one waits until the first releases the lock. Prevents state corruption.

---

## Monitoring Layer

### Prometheus Architecture

```
prom-client (in Node.js code)
  ↓ exposes /metrics endpoint
ServiceMonitor (Kubernetes resource)
  ↓ tells Prometheus where to scrape
Prometheus (running in monitoring namespace)
  ↓ scrapes /metrics every 15 seconds
  ↓ stores time-series data
Grafana
  ↓ queries Prometheus via PromQL
  ↓ renders dashboards
```

### Custom Metrics

```javascript
// Counter — total requests
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  labelNames: ['method', 'route', 'status_code']
})

// Histogram — request duration
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
})
```

### PromQL Queries Used in Dashboard

```
# Request rate per second
rate(http_requests_total[5m])

# Error rate percentage
rate(http_requests_total{status_code=~"5.."}[5m])
  /
rate(http_requests_total[5m]) * 100

# 95th percentile response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Memory usage per pod
container_memory_usage_bytes{namespace="taskmanager"}
```

---

## Networking Layer

### Ingress Rules

```
host: ""  (empty = accept all hostnames)

Path: /api    → Prefix → backend service port 5000
Path: /health → Prefix → backend service port 5000
Path: /       → Prefix → frontend service port 80

No rewrite-target annotation
  → Nginx forwards full original path as-is
  → /api/auth/login reaches Express as /api/auth/login
```

**Why no rewrite-target?**
`rewrite-target: /` would strip all path prefixes before forwarding to the backend. So `/api/auth/login` would become `/` and Express would return `Route GET / not found`. Removing the annotation lets nginx forward the full path unchanged.

### Service Types

```
backend  → ClusterIP  (only reachable inside cluster)
frontend → ClusterIP  (only reachable inside cluster)
postgres → ClusterIP  (only reachable inside cluster)

ingress-nginx → LoadBalancer  (AWS creates ELB, public internet access)
argocd-server → LoadBalancer  (AWS creates ELB, public internet access)
grafana       → LoadBalancer  (AWS creates ELB, public internet access)
```

---

## Security Decisions

| Decision | Reason |
|---|---|
| Non-root Docker users | Limits container escape blast radius |
| JWT for authentication | Stateless, scalable, no session storage needed |
| bcrypt password hashing | Industry standard, computationally expensive to crack |
| Trivy security scanning | Catches known CVEs before deployment |
| Private subnets for nodes | Nodes not directly exposed to internet |
| Secrets in K8s Secrets | Not stored in plain text ConfigMaps |
| AdministratorAccess IAM | Portfolio choice — production would use least privilege + OIDC |
| Remote state encryption | `encrypt = true` in backend.tf — state contains sensitive values |

---

## Data Flow

### User Registration Flow

```
Browser → POST /api/auth/register
              │
              ▼
         Express validates input
              │
              ▼
         Check email not already registered
              │
              ▼
         bcrypt.hash(password, 10)
              │
              ▼
         INSERT INTO users
              │
              ▼
         jwt.sign({id, email, name})
              │
              ▼
         Return {token, user}
              │
              ▼
         Browser stores JWT in memory
              │
              ▼
         All future requests include:
         Authorization: Bearer <token>
```

### GitOps Deployment Flow

```
Developer: git push
              │
              ▼
         GitHub Actions triggers
              │
              ├── Tests pass
              ├── Trivy scan passes
              ├── Docker build + push to Docker Hub
              └── Update helm/values.yaml image tag
                        │
                        ▼
                   git commit + push
                        │
                        ▼
                   ArgoCD detects new commit (every 3 mins)
                        │
                        ▼
                   ArgoCD runs helm upgrade internally
                        │
                        ▼
                   Kubernetes rolling update
                        │
                        ▼
                   New pods start (with new image)
                        │
                        ▼
                   Old pods terminate
                        │
                        ▼
                   Zero downtime deployment ✅
```
