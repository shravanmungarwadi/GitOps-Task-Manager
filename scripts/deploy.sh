#!/bin/bash
# ============================================================
# deploy.sh — Full deployment script for GitOps Task Manager
# Provisions AWS infrastructure and deploys the application
# Run: bash scripts/deploy.sh
# ============================================================

set -e  # Exit immediately if any command fails

echo ""
echo "=================================================="
echo "   GitOps Task Manager — Full Deployment"
echo "=================================================="
echo ""

echo ">>> Step 1: Terraform Apply — Provisioning AWS Infrastructure..."
cd /mnt/d/Projects/gitops-taskmanager/infra/terraform
terraform apply -auto-approve
echo "✅ Infrastructure provisioned!"
echo ""

echo ">>> Step 2: Connecting kubectl to EKS..."
aws eks update-kubeconfig --region ap-south-1 --name gitops-taskmanager-eks
echo "✅ kubectl connected to EKS!"
echo ""

echo ">>> Step 3: Installing Nginx Ingress Controller..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace
echo "✅ Nginx Ingress Controller installed!"
echo ""

echo ">>> Step 4: Waiting 90 seconds for ELB to be provisioned by AWS..."
sleep 90
echo "✅ ELB should be ready!"
echo ""

echo ">>> Step 5: Deploying Application with Helm..."
cd /mnt/d/Projects/gitops-taskmanager
helm install taskmanager helm/ -f helm/values.yaml
echo "✅ Application deployed!"
echo ""

echo ">>> Step 6: Verifying all pods are running..."
kubectl get pods -n taskmanager
echo ""

echo "=================================================="
echo "   Deployment Complete!"
echo "=================================================="
echo ""
echo ">>> Your App URL:"
kubectl get svc -n ingress-nginx ingress-nginx-controller \
  --output jsonpath='{.status.loadBalancer.ingress[0].hostname}'
echo ""
echo "   Open the URL above in your browser!"
echo "   (If blank, wait 1-2 more minutes and run:)"
echo "   kubectl get svc -n ingress-nginx ingress-nginx-controller"
echo ""
