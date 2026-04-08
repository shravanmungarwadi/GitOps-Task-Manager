#!/bin/bash
# ============================================================
# destroy.sh — Full teardown script for GitOps Task Manager
# Removes all Kubernetes resources and AWS infrastructure
# Correct order: ArgoCD app → Monitoring → Ingress → ArgoCD → Terraform
# Run from project root: bash scripts/destroy.sh
# ============================================================

set -e

echo ""
echo "=================================================="
echo "   GitOps Task Manager — Full Teardown"
echo "=================================================="
echo ""

# ── Step 1: Delete ArgoCD Application ────────────────────
echo ">>> Step 1: Deleting ArgoCD Application..."
echo "    (ArgoCD will automatically clean up taskmanager namespace)"
kubectl delete application gitops-taskmanager -n argocd --ignore-not-found=true
echo "    Waiting 30 seconds for ArgoCD to clean up app resources..."
sleep 30
echo "✅ ArgoCD application deleted!"
echo ""

# ── Step 2: Uninstall Prometheus + Grafana ────────────────
echo ">>> Step 2: Uninstalling Prometheus + Grafana..."
helm uninstall kube-prometheus-stack -n monitoring 2>/dev/null || echo "Already uninstalled"
echo "✅ Prometheus + Grafana uninstalled!"
echo ""

# ── Step 3: Uninstall Nginx Ingress ──────────────────────
echo ">>> Step 3: Uninstalling Nginx Ingress Controller..."
echo "    (Kubernetes will automatically delete the AWS ELB)"
helm uninstall ingress-nginx -n ingress-nginx 2>/dev/null || echo "Already uninstalled"
echo "✅ Nginx Ingress uninstalled!"
echo ""

# ── Step 4: Delete ArgoCD ────────────────────────────────
echo ">>> Step 4: Deleting ArgoCD namespace..."
kubectl delete namespace argocd --ignore-not-found=true
echo "✅ ArgoCD deleted!"
echo ""

# ── Step 5: Wait for ELBs to fully delete ────────────────
echo ">>> Step 5: Waiting 90 seconds for all ELBs to be deleted by AWS..."
sleep 90
echo ""

# ── Step 6: Verify ELBs are gone ─────────────────────────
echo ">>> Step 6: Verifying all ELBs are deleted..."
ELB=$(aws elb describe-load-balancers --region ap-south-1 \
  --query 'LoadBalancerDescriptions[*].LoadBalancerName' \
  --output text 2>/dev/null)
if [ -z "$ELB" ]; then
  echo "✅ All ELBs confirmed deleted!"
else
  echo "⚠️  ELB still exists: $ELB"
  echo "    Waiting 30 more seconds..."
  sleep 30
  aws elb delete-load-balancer \
    --load-balancer-name "$ELB" \
    --region ap-south-1 2>/dev/null || true
  sleep 30
fi
echo ""

# ── Step 7: Terraform Destroy ────────────────────────────
echo ">>> Step 7: Terraform Destroy — Removing all AWS Infrastructure..."
cd /mnt/d/Projects/gitops-taskmanager/infra/terraform
terraform destroy -auto-approve
echo "✅ All AWS infrastructure destroyed!"
echo ""

# ── Step 8: Verify ───────────────────────────────────────
echo ">>> Step 8: Verifying everything is gone..."
aws eks list-clusters --region ap-south-1
echo ""

echo "=================================================="
echo "   ✅ Teardown Complete!"
echo "   Zero charges running."
echo "   S3 and DynamoDB remain (effectively free)."
echo "   Run bash scripts/deploy.sh to redeploy."
echo "=================================================="
echo ""
