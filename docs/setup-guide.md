# 🛠️ Setup Guide

Complete guide to deploy GitOps Task Manager on AWS EKS from scratch.

---

## Prerequisites

Make sure you have these installed:

| Tool | Version | Install |
|---|---|---|
| AWS CLI | >= 2.0 | [docs.aws.amazon.com](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) |
| Terraform | >= 1.0 | [developer.hashicorp.com](https://developer.hashicorp.com/terraform/install) |
| kubectl | >= 1.30 | [kubernetes.io](https://kubernetes.io/docs/tasks/tools/) |
| Helm | >= 3.0 | [helm.sh](https://helm.sh/docs/intro/install/) |
| Docker | >= 20.0 | [docs.docker.com](https://docs.docker.com/get-docker/) |

---

## AWS Setup (One-Time)

### Step 1 — Create IAM User
1. Login to AWS Console → IAM → Users → Create User
2. Username: `gitops`
3. Attach policy: `AdministratorAccess`
4. Create access keys → save them

### Step 2 — Configure AWS CLI
```bash
aws configure
# AWS Access Key ID: [your key]
# AWS Secret Access Key: [your secret]
# Default region name: ap-south-1
# Default output format: json
```

### Step 3 — Create Remote State Storage
```bash
# Create S3 bucket
aws s3api create-bucket \
  --bucket gitops-taskmanager-tfstate \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1

# Create DynamoDB table
aws dynamodb create-table \
  --table-name gitops-taskmanager-tflock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region ap-south-1
```

---

## Deploy

```bash
# Clone repo
git clone https://github.com/shravanmungarwadi/GitOps-Task-Manager.git
cd GitOps-Task-Manager

# Deploy everything
bash scripts/deploy.sh
```

Takes ~20-25 minutes. At the end you get:
- App URL
- ArgoCD URL + password
- Grafana URL + password

---

## Destroy

```bash
bash scripts/destroy.sh
```

Takes ~10-15 minutes. Stops all AWS charges.

---

## Cost

| Running | Destroyed |
|---|---|
| ~$0.32/hour | $0.00/hour |
| ~$7.68/day | S3 + DynamoDB only (~$0.00) |

Always run `bash scripts/destroy.sh` when done testing!
