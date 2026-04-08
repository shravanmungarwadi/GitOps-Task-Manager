# 🚀 How to Run This Project

Complete guide to understanding the deployment flow, what each script does line by line, and how to run and tear down the entire project.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [One-Time AWS Setup](#one-time-aws-setup)
- [Deploy Flow — What Happens When You Run deploy.sh](#deploy-flow)
- [Destroy Flow — What Happens When You Run destroy.sh](#destroy-flow)
- [deploy.sh — Line by Line Explanation](#deploysh--line-by-line-explanation)
- [destroy.sh — Line by Line Explanation](#destroysh--line-by-line-explanation)
- [Verifying Everything is Working](#verifying-everything-is-working)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Install these tools before running anything:

| Tool | Version | Why It's Needed |
|---|---|---|
| AWS CLI | >= 2.0 | Talk to AWS APIs from terminal |
| Terraform | >= 1.0 | Provision AWS infrastructure |
| kubectl | >= 1.30 | Talk to Kubernetes cluster |
| Helm | >= 3.0 | Deploy apps on Kubernetes |
| Docker | >= 20.0 | Build and run containers locally |
| Git | Any | Clone repo, push code |

**Verify all tools are installed:**
```bash
aws --version
terraform --version
kubectl version --client
helm version
docker --version
git --version
```

---

## One-Time AWS Setup

This setup is done **once** — never again.

### Step 1 — Create IAM User

1. Login to AWS Console
2. Go to IAM → Users → Create User
3. Username: `gitops`
4. Attach policy: `AdministratorAccess`
5. Go to Security Credentials → Create Access Key
6. Save the Access Key ID and Secret Access Key

### Step 2 — Configure AWS CLI

```bash
aws configure
# AWS Access Key ID:     [paste your access key]
# AWS Secret Access Key: [paste your secret key]
# Default region name:   ap-south-1
# Default output format: json
```

Verify it works:
```bash
aws sts get-caller-identity
# Should return your Account ID and ARN
```

### Step 3 — Create Remote State Storage

Terraform needs an S3 bucket to store state and a DynamoDB table for locking. Create these ONCE manually:

```bash
# Create S3 bucket for Terraform state
aws s3api create-bucket \
  --bucket gitops-taskmanager-tfstate \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name gitops-taskmanager-tflock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-south-1
```

These two resources are **never destroyed** — they persist between sessions and are effectively free.

### Step 4 — Clone Repository

```bash
git clone https://github.com/shravanmungarwadi/GitOps-Task-Manager.git
cd GitOps-Task-Manager
```

---

## Deploy Flow

This is the complete picture of what happens when you run `bash scripts/deploy.sh`:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    bash scripts/deploy.sh                            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1 — terraform apply (~12-15 minutes)                          │
│                                                                      │
│  Terraform reads infra/terraform/*.tf files                         │
│  Downloads AWS provider plugin                                       │
│  Creates on AWS:                                                     │
│    • VPC (10.0.0.0/16)                                              │
│    • 2 Public Subnets + 2 Private Subnets                           │
│    • Internet Gateway + NAT Gateway                                  │
│    • EKS Control Plane (Kubernetes 1.30)                            │
│    • 2× t3.medium EC2 Worker Nodes                                  │
│    • All IAM Roles and Policies                                      │
│    • EBS CSI Driver Addon                                            │
│  Saves state to S3 bucket                                            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2 — kubectl connect to EKS (~5 seconds)                       │
│                                                                      │
│  aws eks update-kubeconfig                                           │
│  Adds EKS cluster credentials to ~/.kube/config                     │
│  kubectl can now talk to the EKS cluster                            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3 — Install Nginx Ingress Controller (~2 minutes)             │
│                                                                      │
│  Helm installs nginx ingress in ingress-nginx namespace             │
│  Creates a LoadBalancer Service                                      │
│  AWS sees LoadBalancer → automatically creates ELB                  │
│  ELB gets a public DNS hostname                                      │
│  Wait 90 seconds for ELB to fully provision                         │
│                                                                      │
│  After this step: App has a public URL (even before app deployed)   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4 — Install ArgoCD (~3 minutes)                               │
│                                                                      │
│  Creates argocd namespace                                            │
│  Applies ArgoCD manifests with --server-side flag                   │
│  (server-side avoids 256KB annotation size limit)                   │
│  Waits 90 seconds for all ArgoCD pods to be Ready                   │
│                                                                      │
│  Exposes ArgoCD UI as LoadBalancer → gets own ELB URL               │
│  Retrieves ArgoCD admin password from Kubernetes secret             │
│                                                                      │
│  Creates ArgoCD Application resource:                               │
│    • Points to GitHub repo                                           │
│    • Watches helm/ directory                                         │
│    • Uses helm/values.yaml                                           │
│    • AutoSync enabled → deploys automatically                        │
│    • SelfHeal enabled → reverts manual changes                      │
│                                                                      │
│  ArgoCD immediately starts syncing → deploys your app               │
│  Wait 120 seconds for ArgoCD to complete first sync                 │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5 — Install Prometheus + Grafana (~2 minutes)                 │
│                                                                      │
│  Helm installs kube-prometheus-stack in monitoring namespace        │
│  Uses monitoring/prometheus-values.yml for configuration            │
│  Grafana service type = LoadBalancer → gets own ELB URL             │
│  Grafana password = admin123                                         │
│                                                                      │
│  Applies backend-servicemonitor.yml:                                │
│    Tells Prometheus to scrape /metrics from backend pods            │
│    Every 15 seconds automatically                                    │
│                                                                      │
│  Wait 90 seconds for Grafana ELB to provision                       │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 6 + 7 — Collect URLs and Verify Pods                          │
│                                                                      │
│  Gets ELB hostname for: App, ArgoCD, Grafana                        │
│  Shows all running pods in all namespaces                           │
│  Prints complete summary with all URLs and passwords                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  DEPLOYMENT COMPLETE (~20-25 minutes total)                         │
│                                                                      │
│  APP URL:     http://[elb].ap-south-1.elb.amazonaws.com            │
│  ARGOCD URL:  http://[elb].ap-south-1.elb.amazonaws.com            │
│               Username: admin  Password: [auto-generated]           │
│  GRAFANA URL: http://[elb].ap-south-1.elb.amazonaws.com            │
│               Username: admin  Password: admin123                   │
│                                                                      │
│  Running cost: ~$0.32/hour                                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Destroy Flow

This is the complete picture of what happens when you run `bash scripts/destroy.sh`:

```
┌─────────────────────────────────────────────────────────────────────┐
│                   bash scripts/destroy.sh                            │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1 — Delete ArgoCD Application (~30 seconds)                   │
│                                                                      │
│  kubectl delete application gitops-taskmanager -n argocd            │
│                                                                      │
│  WHY FIRST?                                                          │
│  ArgoCD deployed the app — so ArgoCD must clean it up first         │
│  If we delete ArgoCD namespace directly, the taskmanager            │
│  namespace and all its resources would be orphaned                  │
│                                                                      │
│  ArgoCD automatically deletes:                                       │
│    • taskmanager namespace                                           │
│    • All pods (backend, frontend, postgres)                          │
│    • All services, configmaps, secrets                               │
│    • PVC (but EBS volume may take a moment)                         │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2 — Uninstall Prometheus + Grafana (~10 seconds)              │
│                                                                      │
│  helm uninstall kube-prometheus-stack -n monitoring                 │
│                                                                      │
│  Deletes: Prometheus, Grafana, AlertManager, all CRDs               │
│  Grafana's LoadBalancer service deleted → AWS removes Grafana ELB   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3 — Uninstall Nginx Ingress (~10 seconds)                     │
│                                                                      │
│  helm uninstall ingress-nginx -n ingress-nginx                      │
│                                                                      │
│  THIS IS THE MOST CRITICAL STEP                                      │
│  Nginx Ingress has a LoadBalancer service                           │
│  When Helm uninstalls it → Kubernetes deletes the service           │
│  AWS sees service deleted → automatically deletes the ELB           │
│                                                                      │
│  If we skip this step and run terraform destroy:                    │
│    ELB still exists → still attached to VPC subnets                │
│    Terraform tries to delete VPC → DependencyViolation error        │
│    VPC cannot be deleted while ELB is using it                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4 — Delete ArgoCD Namespace (~10 seconds)                     │
│                                                                      │
│  kubectl delete namespace argocd                                     │
│                                                                      │
│  ArgoCD server has a LoadBalancer service                           │
│  Deleting namespace → deletes service → AWS removes ArgoCD ELB     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5 — Wait 90 Seconds                                           │
│                                                                      │
│  sleep 90                                                            │
│                                                                      │
│  AWS needs time to fully deregister and delete all ELBs             │
│  Even after Kubernetes deletes the service, AWS takes               │
│  60-90 seconds to fully remove the ELB from its systems            │
│  If we don't wait → terraform destroy hits VPC dependency error     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 6 — Verify ELBs are Gone                                      │
│                                                                      │
│  aws elb describe-load-balancers                                     │
│  If any ELB still exists → force delete it                          │
│  This is a safety net for edge cases                                │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 7 — terraform destroy (~10-15 minutes)                        │
│                                                                      │
│  Destroys all 26 AWS resources in correct order:                    │
│    • EKS Node Group                                                  │
│    • EKS Cluster                                                     │
│    • NAT Gateway + Elastic IP                                        │
│    • Internet Gateway                                                │
│    • Subnets (public + private)                                      │
│    • Route Tables                                                    │
│    • VPC                                                             │
│    • IAM Roles + Policies                                            │
│                                                                      │
│  State updated in S3 — shows everything as destroyed               │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 8 — Verify Everything is Gone                                 │
│                                                                      │
│  aws eks list-clusters → should return {"clusters": []}             │
│                                                                      │
│  WHAT SURVIVES (free):                                              │
│    • S3 bucket with terraform.tfstate                               │
│    • DynamoDB lock table                                             │
│                                                                      │
│  RUNNING COST: $0.00/hour ✅                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## deploy.sh — Line by Line Explanation

```bash
#!/bin/bash
```
Tells the OS to run this script with bash interpreter.

```bash
set -e
```
Exit immediately if ANY command fails. Prevents the script from continuing with broken state. If terraform apply fails, the script stops — doesn't try to connect kubectl to a non-existent cluster.

```bash
helm repo add ingress-nginx https://... 2>/dev/null || true
```
`2>/dev/null` — suppresses error output.
`|| true` — if the command fails (repo already added), treat it as success and continue.
Without this, `set -e` would exit the script if the repo was already added.

```bash
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
```
`--dry-run=client -o yaml` — generates the YAML without creating anything.
`| kubectl apply -f -` — pipes that YAML to apply.
Effect: Creates namespace if it doesn't exist, does nothing if it already exists.
Regular `kubectl create namespace` fails if namespace exists — this pattern is idempotent.

```bash
kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml \
  --server-side --force-conflicts
```
`--server-side` — processing happens on the Kubernetes API server, not the client.
Without this: kubectl stores the entire manifest in an annotation (`last-applied-configuration`).
ArgoCD manifest is >256KB → exceeds Kubernetes annotation limit → fails.
`--server-side` avoids this by not storing in annotations.
`--force-conflicts` — if a field is already managed by another manager, take ownership.

```bash
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=180s
```
Pauses the script until ALL pods in argocd namespace are Ready.
`--timeout=180s` — if pods aren't ready in 3 minutes, fail the script.
Ensures ArgoCD is fully operational before we try to use it.

```bash
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d)
```
Gets the auto-generated ArgoCD admin password from a Kubernetes Secret.
`-o jsonpath="{.data.password}"` — extracts just the password field.
`| base64 -d` — decodes from base64 (Kubernetes stores secrets as base64).

```bash
kubectl apply -f - <<ARGOAPP
apiVersion: argoproj.io/v1alpha1
...
ARGOAPP
```
Heredoc syntax — creates an ArgoCD Application resource inline.
`-f -` means read from stdin.
`<<ARGOAPP ... ARGOAPP` provides the YAML content as stdin.
Creates the GitOps connection between ArgoCD and GitHub.

---

## destroy.sh — Line by Line Explanation

```bash
kubectl delete application gitops-taskmanager -n argocd --ignore-not-found=true
```
`--ignore-not-found=true` — if the application doesn't exist, don't fail.
Makes the script safe to run even if deploy partially failed.

```bash
helm uninstall kube-prometheus-stack -n monitoring 2>/dev/null || echo "Already uninstalled"
```
`2>/dev/null` — hides error if release doesn't exist.
`|| echo "Already uninstalled"` — prints message and continues if not found.
Without this, `set -e` would exit if helm release wasn't found.

```bash
sleep 90
```
Critical wait. AWS ELBs are not deleted instantly. The sequence is:
1. Kubernetes deletes LoadBalancer Service → sends signal to AWS
2. AWS deregisters targets from ELB
3. AWS deletes ELB
4. AWS releases subnet associations

Steps 2-4 take 60-90 seconds. If terraform destroy runs before this:
- VPC still has ELB associations → `DependencyViolation` error

```bash
ELB=$(aws elb describe-load-balancers --region ap-south-1 \
  --query 'LoadBalancerDescriptions[*].LoadBalancerName' \
  --output text 2>/dev/null)
if [ -z "$ELB" ]; then
  echo "✅ All ELBs confirmed deleted!"
else
  aws elb delete-load-balancer --load-balancer-name "$ELB" ...
fi
```
`-z "$ELB"` — true if ELB variable is empty (no ELBs found).
Safety net — if any ELB survived the wait, force delete it before terraform.

```bash
terraform destroy -auto-approve
```
`-auto-approve` — skips the `yes/no` confirmation prompt.
Makes the script fully automatic without human input.

---

## Verifying Everything is Working

After deploy completes, verify each component:

**App is working:**
```bash
curl http://[APP_URL]/health
# Expected: {"status":"healthy","environment":"production","timestamp":"..."}
```

**All pods running:**
```bash
kubectl get pods -n taskmanager
kubectl get pods -n argocd
kubectl get pods -n monitoring
```

**ArgoCD synced:**
```bash
kubectl get application -n argocd
# Expected: STATUS=Synced, HEALTH=Healthy
```

**Ingress configured:**
```bash
kubectl get ingress -n taskmanager
# Expected: ADDRESS shows ELB hostname
```

**Prometheus scraping backend:**
```bash
kubectl get servicemonitor -n monitoring
# Expected: backend-servicemonitor listed
```

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `terraform apply` fails with AMI error | K8s version AMI not available | Change `kubernetes_version` in variables.tf to `"1.30"` |
| PVC stuck in Pending | EBS CSI Driver missing or wrong StorageClass | Verify `storageClassName: gp2` in values.yaml |
| Pods in CrashLoopBackOff | Backend can't connect to postgres | Check DB_HOST in configmap matches postgres service name |
| ArgoCD install annotation error | Manifest too large for client-side apply | Use `--server-side --force-conflicts` flag |
| 404 from app URL | Ingress host mismatch | Verify `host: ""` in values.yaml |
| VPC deletion fails on destroy | ELB still attached | Always run `helm uninstall ingress-nginx` before `terraform destroy` |
| kubectl can't connect after WSL2 restart | DNS timeout | Run `sudo systemctl restart systemd-resolved` |
| Terraform state lock stuck | Previous apply interrupted | Run `terraform force-unlock [lock-id]` |
| Grafana shows No Data | ServiceMonitor label mismatch | Verify ServiceMonitor selector matches backend service labels |

---

## Cost Reference

| Scenario | Cost |
|---|---|
| Writing files, not deployed | $0.00/hour |
| Running — EKS + EC2 + NAT | ~$0.32/hour |
| Running all day (24hrs) | ~$7.68/day |
| Destroyed — S3 + DynamoDB only | ~$0.00/month |

**Always run `bash scripts/destroy.sh` when done!**
