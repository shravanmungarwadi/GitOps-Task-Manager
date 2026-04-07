#!/bin/bash
# ============================================================
# destroy.sh — Full teardown script for GitOps Task Manager
# Removes all Kubernetes resources and AWS infrastructure
# Run: bash scripts/destroy.sh
# ============================================================

set -e  # Exit immediately if any command fails

echo ""
echo "=================================================="
echo "   GitOps Task Manager — Full Teardown"
echo "=================================================="
echo ""

echo ">>> Step 1: Uninstalling Application from Kubernetes..."
cd /mnt/d/Projects/gitops-taskmanager
helm uninstall taskmanager
echo "✅ Application uninstalled!"
echo ""

echo ">>> Step 2: Uninstalling Nginx Ingress Controller..."
echo "    (This tells Kubernetes to delete the ELB automatically)"
helm uninstall ingress-nginx -n ingress-nginx
echo "✅ Nginx Ingress uninstalled!"
echo ""

echo ">>> Step 3: Waiting 60 seconds for AWS to fully delete the ELB..."
sleep 60
echo "✅ ELB should be deleted!"
echo ""

echo ">>> Step 4: Verifying ELB is gone..."
ELB=$(aws elb describe-load-balancers --region ap-south-1 \
  --query 'LoadBalancerDescriptions[*].LoadBalancerName' --output text)
if [ -z "$ELB" ]; then
  echo "✅ ELB confirmed deleted!"
else
  echo "⚠️  ELB still exists: $ELB"
  echo "    Waiting 30 more seconds..."
  sleep 30
fi
echo ""

echo ">>> Step 5: Terraform Destroy — Removing all AWS Infrastructure..."
cd /mnt/d/Projects/gitops-taskmanager/infra/terraform
terraform destroy -auto-approve
echo "✅ All AWS infrastructure destroyed!"
echo ""

echo ">>> Step 6: Verifying everything is gone..."
aws eks list-clusters --region ap-south-1
echo ""

echo "=================================================="
echo "   Teardown Complete! Zero charges running."
echo "   S3 and DynamoDB remain (effectively free)."
echo "=================================================="
echo ""
