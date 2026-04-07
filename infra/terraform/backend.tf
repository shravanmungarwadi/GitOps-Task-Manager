# ============================================================
# backend.tf
# Configures Terraform remote state storage on AWS S3 and
# state locking via DynamoDB. Must be initialised with
# terraform init before any other commands are run.
# ============================================================

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  backend "s3" {
    bucket         = "gitops-taskmanager-tfstate"
    key            = "eks/terraform.tfstate"
    region         = "ap-south-1"
    dynamodb_table = "gitops-taskmanager-tflock"
    encrypt        = true
  }
}