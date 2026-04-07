# ============================================================
# main.tf
# Configures the AWS provider with region and default tags.
# All resources created by Terraform automatically inherit
# the default tags defined here.
# ============================================================

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}