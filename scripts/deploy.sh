#!/bin/bash
# ============================================================
# deploy.sh — Full deployment script for GitOps Task Manager
# Provisions AWS infrastructure and deploys the application
# Installs: Nginx Ingress, ArgoCD, Prometheus, Grafana
# Run from project root: bash scripts/deploy.sh
# ============================================================

set -e  # Exit immediately if any command fails

echo ""
echo "=================================================="
echo "   GitOps Task Manager — Full Deployment"
echo "=================================================="
echo ""

# ── Step 1: Terraform ─────────────────────────────────────
echo ">>> Step 1: Terraform Apply — Provisioning AWS Infrastructure..."
cd /mnt/d/Projects/gitops-taskmanager/infra/terraform
terraform apply -auto-approve
echo "✅ Infrastructure provisioned!"
echo ""

# ── Step 2: Connect kubectl ───────────────────────────────
echo ">>> Step 2: Connecting kubectl to EKS..."
aws eks update-kubeconfig --region ap-south-1 --name gitops-taskmanager-eks
echo "✅ kubectl connected to EKS!"
echo ""

# ── Step 3: Nginx Ingress Controller ─────────────────────
echo ">>> Step 3: Installing Nginx Ingress Controller..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=LoadBalancer
echo "✅ Nginx Ingress Controller installed!"
echo ""

echo ">>> Waiting 90 seconds for App ELB to be provisioned by AWS..."
sleep 90
APP_URL=$(kubectl get svc -n ingress-nginx ingress-nginx-controller \
  --output jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "✅ App ELB ready: $APP_URL"
echo ""

# ── Step 4: ArgoCD ────────────────────────────────────────
echo ">>> Step 4: Installing ArgoCD..."
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
echo "    Waiting 60 seconds for ArgoCD pods to start..."
sleep 60
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=120s
echo "✅ ArgoCD installed!"
echo ""

echo ">>> Exposing ArgoCD UI as LoadBalancer..."
kubectl patch svc argocd-server -n argocd \
  -p '{"spec": {"type": "LoadBalancer"}}'
echo "    Waiting 60 seconds for ArgoCD ELB..."
sleep 60
ARGOCD_URL=$(kubectl get svc argocd-server -n argocd \
  --output jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "✅ ArgoCD ELB ready: $ARGOCD_URL"
echo ""

echo ">>> Getting ArgoCD admin password..."
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d)
echo "✅ ArgoCD password retrieved!"
echo ""

echo ">>> Connecting ArgoCD to GitHub repo..."
kubectl apply -f - <<ARGOAPP
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: gitops-taskmanager
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/shravanmungarwadi/GitOps-Task-Manager.git
    targetRevision: HEAD
    path: helm
    helm:
      valueFiles:
        - values.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: taskmanager
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
ARGOAPP
echo "✅ ArgoCD connected to GitHub and syncing app!"
echo ""

echo ">>> Waiting 90 seconds for ArgoCD to deploy the app..."
sleep 90
echo ""

# ── Step 5: Prometheus + Grafana ─────────────────────────
echo ">>> Step 5: Installing Prometheus + Grafana..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
kubectl create namespace monitoring --dry-run=client -o yaml | kubectl apply -f -
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values /mnt/d/Projects/gitops-taskmanager/monitoring/prometheus-values.yml \
  --set grafana.service.type=LoadBalancer \
  --set grafana.adminPassword=admin123
echo "    Waiting 60 seconds for Prometheus + Grafana pods..."
sleep 60
echo "✅ Prometheus + Grafana installed!"
echo ""

echo ">>> Applying Backend ServiceMonitor..."
kubectl apply -f /mnt/d/Projects/gitops-taskmanager/monitoring/backend-servicemonitor.yml
echo "✅ ServiceMonitor applied!"
echo ""

echo ">>> Waiting 60 seconds for Grafana ELB..."
sleep 60
GRAFANA_URL=$(kubectl get svc -n monitoring kube-prometheus-stack-grafana \
  --output jsonpath='{.status.loadBalancer.ingress[0].hostname}')
echo "✅ Grafana ELB ready!"
echo ""

# ── Step 6: Verify all pods ───────────────────────────────
echo ">>> Step 6: Verifying all pods..."
echo ""
echo "--- App Pods ---"
kubectl get pods -n taskmanager
echo ""
echo "--- ArgoCD Pods ---"
kubectl get pods -n argocd
echo ""
echo "--- Monitoring Pods ---"
kubectl get pods -n monitoring
echo ""

# ── Step 7: Print all URLs ────────────────────────────────
echo "=================================================="
echo "   Deployment Complete!"
echo "=================================================="
echo ""
echo ">>> YOUR APP URL:"
echo "    http://$APP_URL"
echo ""
echo ">>> ARGOCD URL:"
echo "    http://$ARGOCD_URL"
echo "    Username: admin"
echo "    Password: $ARGOCD_PASSWORD"
echo ""
echo ">>> GRAFANA URL:"
echo "    http://$GRAFANA_URL"
echo "    Username: admin"
echo "    Password: admin123"
echo ""
echo "=================================================="
echo "   All services are live!"
echo "   Take screenshots for your portfolio!"
echo "=================================================="
echo ""
