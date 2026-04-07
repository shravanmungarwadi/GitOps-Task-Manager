# ============================================================
# outputs.tf
# Exposes key infrastructure values after terraform apply.
# Use these values to configure kubectl, verify resources,
# and connect other tools to the cluster.
# ============================================================

output "cluster_name" {
  description = "Name of the EKS cluster"
  value       = aws_eks_cluster.main.name
}

output "cluster_endpoint" {
  description = "Endpoint URL of the EKS cluster API server"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_version" {
  description = "Kubernetes version running on the EKS cluster"
  value       = aws_eks_cluster.main.version
}

output "cluster_certificate_authority" {
  description = "Base64 encoded certificate authority data for the cluster"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

output "vpc_id" {
  description = "ID of the VPC created for the cluster"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "IDs of the private subnets where worker nodes run"
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "IDs of the public subnets where load balancers run"
  value       = aws_subnet.public[*].id
}

output "node_group_name" {
  description = "Name of the EKS managed node group"
  value       = aws_eks_node_group.main.node_group_name
}

output "aws_region" {
  description = "AWS region where the cluster is deployed"
  value       = var.aws_region
}

output "kubeconfig_command" {
  description = "Run this command to configure kubectl to connect to the cluster"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${aws_eks_cluster.main.name}"
}