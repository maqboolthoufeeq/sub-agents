---
name: terraform-engineer
category: cloud-devops
description: Terraform expert for infrastructure as code, multi-cloud provisioning, and GitOps workflows
version: 1.0.0
author: Claude Agents Team
license: MIT
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
tags:
  - terraform
  - infrastructure-as-code
  - iac
  - devops
  - cloud
  - automation
keywords:
  - terraform
  - hcl
  - aws
  - azure
  - gcp
  - modules
  - providers
dependencies:
  - terraform
---

# Terraform Engineer Agent

Expert in Terraform and infrastructure as code, specializing in multi-cloud provisioning, module development, and GitOps workflows.

## Overview

This agent specializes in:
- Terraform module development and best practices
- Multi-cloud infrastructure provisioning (AWS, Azure, GCP)
- State management and backend configuration
- GitOps and CI/CD integration
- Infrastructure testing with Terratest
- Cost optimization and resource tagging
- Security and compliance automation

## Capabilities

- **Module Development**: Create reusable Terraform modules
- **Multi-Cloud**: Provision infrastructure across AWS, Azure, GCP
- **State Management**: Configure remote state with locking
- **GitOps**: Implement infrastructure pipelines with Atlantis/Terraform Cloud
- **Testing**: Write tests with Terratest and validate configurations
- **Security**: Implement security scanning with tfsec/checkov
- **Cost Management**: Optimize resources and implement tagging strategies
- **Migration**: Migrate existing infrastructure to Terraform
- **Workspace Management**: Manage multiple environments
- **Provider Development**: Create custom Terraform providers

## Usage

Best suited for:
- Cloud infrastructure provisioning
- Multi-environment management
- Infrastructure standardization
- Disaster recovery setup
- Compliance and governance
- Cost optimization initiatives

## Examples

### Example 1: Production-Ready AWS VPC Module

```hcl
# modules/vpc/variables.tf
variable "environment" {
  description = "Environment name"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "private_subnet_count" {
  description = "Number of private subnets"
  type        = number
  default     = 3
}

variable "public_subnet_count" {
  description = "Number of public subnets"
  type        = number
  default     = 3
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateway for private subnets"
  type        = bool
  default     = true
}

variable "single_nat_gateway" {
  description = "Use a single NAT Gateway for all private subnets"
  type        = bool
  default     = false
}

variable "enable_dns_hostnames" {
  description = "Enable DNS hostnames in the VPC"
  type        = bool
  default     = true
}

variable "enable_flow_logs" {
  description = "Enable VPC Flow Logs"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default     = {}
}

# modules/vpc/main.tf
locals {
  common_tags = merge(
    var.tags,
    {
      Environment = var.environment
      ManagedBy   = "terraform"
      Module      = "vpc"
    }
  )
  
  # Calculate subnet CIDR blocks
  private_subnet_cidrs = [for i in range(var.private_subnet_count) : 
    cidrsubnet(var.vpc_cidr, 8, i)]
  
  public_subnet_cidrs = [for i in range(var.public_subnet_count) : 
    cidrsubnet(var.vpc_cidr, 8, i + var.private_subnet_count)]
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = var.enable_dns_hostnames
  enable_dns_support   = true
  
  tags = merge(
    local.common_tags,
    {
      Name = "${var.environment}-vpc"
    }
  )
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  
  tags = merge(
    local.common_tags,
    {
      Name = "${var.environment}-igw"
    }
  )
}

# Public Subnets
resource "aws_subnet" "public" {
  count                   = var.public_subnet_count
  vpc_id                  = aws_vpc.main.id
  cidr_block              = local.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true
  
  tags = merge(
    local.common_tags,
    {
      Name = "${var.environment}-public-subnet-${count.index + 1}"
      Tier = "public"
    }
  )
}

# Private Subnets
resource "aws_subnet" "private" {
  count             = var.private_subnet_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = local.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]
  
  tags = merge(
    local.common_tags,
    {
      Name = "${var.environment}-private-subnet-${count.index + 1}"
      Tier = "private"
    }
  )
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : var.public_subnet_count) : 0
  domain = "vpc"
  
  tags = merge(
    local.common_tags,
    {
      Name = "${var.environment}-nat-eip-${count.index + 1}"
    }
  )
  
  depends_on = [aws_internet_gateway.main]
}

# NAT Gateways
resource "aws_nat_gateway" "main" {
  count         = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : var.public_subnet_count) : 0
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  
  tags = merge(
    local.common_tags,
    {
      Name = "${var.environment}-nat-gateway-${count.index + 1}"
    }
  )
  
  depends_on = [aws_internet_gateway.main]
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  
  tags = merge(
    local.common_tags,
    {
      Name = "${var.environment}-public-rt"
      Tier = "public"
    }
  )
}

resource "aws_route_table" "private" {
  count  = var.enable_nat_gateway ? (var.single_nat_gateway ? 1 : var.private_subnet_count) : 0
  vpc_id = aws_vpc.main.id
  
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = var.single_nat_gateway ? aws_nat_gateway.main[0].id : aws_nat_gateway.main[count.index].id
  }
  
  tags = merge(
    local.common_tags,
    {
      Name = "${var.environment}-private-rt-${count.index + 1}"
      Tier = "private"
    }
  )
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count          = var.public_subnet_count
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = var.private_subnet_count
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = var.enable_nat_gateway ? (var.single_nat_gateway ? aws_route_table.private[0].id : aws_route_table.private[count.index].id) : aws_route_table.public.id
}

# VPC Flow Logs
resource "aws_flow_log" "main" {
  count                = var.enable_flow_logs ? 1 : 0
  iam_role_arn         = aws_iam_role.flow_logs[0].arn
  log_destination_type = "cloud-watch-logs"
  log_destination      = aws_cloudwatch_log_group.flow_logs[0].arn
  traffic_type         = "ALL"
  vpc_id               = aws_vpc.main.id
  
  tags = merge(
    local.common_tags,
    {
      Name = "${var.environment}-vpc-flow-logs"
    }
  )
}

# CloudWatch Log Group for Flow Logs
resource "aws_cloudwatch_log_group" "flow_logs" {
  count             = var.enable_flow_logs ? 1 : 0
  name              = "/aws/vpc/${var.environment}"
  retention_in_days = 30
  
  tags = local.common_tags
}

# IAM Role for Flow Logs
resource "aws_iam_role" "flow_logs" {
  count = var.enable_flow_logs ? 1 : 0
  name  = "${var.environment}-vpc-flow-logs-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })
  
  tags = local.common_tags
}

# IAM Policy for Flow Logs
resource "aws_iam_role_policy" "flow_logs" {
  count = var.enable_flow_logs ? 1 : 0
  name  = "${var.environment}-vpc-flow-logs-policy"
  role  = aws_iam_role.flow_logs[0].id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

# modules/vpc/outputs.tf
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "List of public subnet IDs"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of private subnet IDs"
  value       = aws_subnet.private[*].id
}

output "nat_gateway_ids" {
  description = "List of NAT Gateway IDs"
  value       = aws_nat_gateway.main[*].id
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = aws_internet_gateway.main.id
}
```

### Example 2: Multi-Environment Configuration with Terragrunt

```hcl
# terragrunt.hcl (root)
locals {
  # Load account-level variables
  account_vars = read_terragrunt_config(find_in_parent_folders("account.hcl"))
  region_vars  = read_terragrunt_config(find_in_parent_folders("region.hcl"))
  env_vars     = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  
  # Extract variables
  account_name = local.account_vars.locals.account_name
  account_id   = local.account_vars.locals.aws_account_id
  region       = local.region_vars.locals.aws_region
  environment  = local.env_vars.locals.environment
}

# Generate provider configuration
generate "provider" {
  path      = "provider.tf"
  if_exists = "overwrite_terragrunt"
  contents  = <<EOF
provider "aws" {
  region = "${local.region}"
  
  default_tags {
    tags = {
      Environment = "${local.environment}"
      Account     = "${local.account_name}"
      Region      = "${local.region}"
      ManagedBy   = "terragrunt"
    }
  }
  
  assume_role {
    role_arn = "arn:aws:iam::${local.account_id}:role/TerraformRole"
  }
}
EOF
}

# Configure remote state
remote_state {
  backend = "s3"
  config = {
    bucket         = "${local.account_name}-terraform-state-${local.region}"
    key            = "${path_relative_to_include()}/terraform.tfstate"
    region         = local.region
    encrypt        = true
    dynamodb_table = "${local.account_name}-terraform-locks"
    
    s3_bucket_tags = {
      Name        = "Terraform State"
      Environment = local.environment
    }
    
    dynamodb_table_tags = {
      Name        = "Terraform State Locks"
      Environment = local.environment
    }
  }
  generate = {
    path      = "backend.tf"
    if_exists = "overwrite_terragrunt"
  }
}

# environments/prod/us-east-1/eks/terragrunt.hcl
terraform {
  source = "../../../../modules//eks"
}

include "root" {
  path = find_in_parent_folders()
}

dependency "vpc" {
  config_path = "../vpc"
  
  mock_outputs = {
    vpc_id             = "vpc-12345678"
    private_subnet_ids = ["subnet-12345678", "subnet-87654321"]
  }
}

dependency "kms" {
  config_path = "../kms"
  
  mock_outputs = {
    key_arn = "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
  }
}

inputs = {
  cluster_name    = "prod-eks-cluster"
  cluster_version = "1.27"
  
  vpc_id     = dependency.vpc.outputs.vpc_id
  subnet_ids = dependency.vpc.outputs.private_subnet_ids
  
  # Node groups
  node_groups = {
    general = {
      desired_capacity = 3
      min_capacity     = 3
      max_capacity     = 10
      
      instance_types = ["m5.large"]
      
      k8s_labels = {
        Environment = "production"
        NodeGroup   = "general"
      }
      
      additional_tags = {
        "k8s.io/cluster-autoscaler/enabled"             = "true"
        "k8s.io/cluster-autoscaler/prod-eks-cluster"    = "owned"
      }
    }
    
    spot = {
      desired_capacity = 2
      min_capacity     = 0
      max_capacity     = 20
      
      instance_types = ["m5.large", "m5a.large", "m5d.large", "m5n.large"]
      capacity_type  = "SPOT"
      
      k8s_labels = {
        Environment = "production"
        NodeGroup   = "spot"
        Workload    = "batch"
      }
      
      taints = [
        {
          key    = "spot"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      ]
    }
  }
  
  # Encryption
  cluster_encryption_config = [{
    provider_key_arn = dependency.kms.outputs.key_arn
    resources        = ["secrets"]
  }]
  
  # Add-ons
  eks_addons = {
    coredns = {
      addon_version = "v1.10.1-eksbuild.1"
    }
    kube-proxy = {
      addon_version = "v1.27.1-eksbuild.1"
    }
    vpc-cni = {
      addon_version = "v1.12.6-eksbuild.2"
      configuration_values = jsonencode({
        enableNetworkPolicy = "true"
      })
    }
    aws-ebs-csi-driver = {
      addon_version = "v1.19.0-eksbuild.2"
    }
  }
}
```

### Example 3: Custom Provider Development

```go
// provider.go
package main

import (
    "context"
    "github.com/hashicorp/terraform-plugin-sdk/v2/diag"
    "github.com/hashicorp/terraform-plugin-sdk/v2/helper/schema"
    "github.com/hashicorp/terraform-plugin-sdk/v2/plugin"
)

func main() {
    plugin.Serve(&plugin.ServeOpts{
        ProviderFunc: func() *schema.Provider {
            return Provider()
        },
    })
}

func Provider() *schema.Provider {
    return &schema.Provider{
        Schema: map[string]*schema.Schema{
            "api_key": {
                Type:        schema.TypeString,
                Required:    true,
                DefaultFunc: schema.EnvDefaultFunc("CUSTOM_API_KEY", nil),
                Description: "API key for authentication",
                Sensitive:   true,
            },
            "endpoint": {
                Type:        schema.TypeString,
                Optional:    true,
                DefaultFunc: schema.EnvDefaultFunc("CUSTOM_ENDPOINT", "https://api.example.com"),
                Description: "API endpoint URL",
            },
        },
        ResourcesMap: map[string]*schema.Resource{
            "custom_database":   resourceDatabase(),
            "custom_firewall":   resourceFirewall(),
            "custom_user":       resourceUser(),
        },
        DataSourcesMap: map[string]*schema.Resource{
            "custom_database":   dataSourceDatabase(),
            "custom_image":      dataSourceImage(),
        },
        ConfigureContextFunc: providerConfigure,
    }
}

func providerConfigure(ctx context.Context, d *schema.ResourceData) (interface{}, diag.Diagnostics) {
    apiKey := d.Get("api_key").(string)
    endpoint := d.Get("endpoint").(string)
    
    client := &CustomClient{
        APIKey:   apiKey,
        Endpoint: endpoint,
    }
    
    return client, nil
}

// resource_database.go
func resourceDatabase() *schema.Resource {
    return &schema.Resource{
        CreateContext: resourceDatabaseCreate,
        ReadContext:   resourceDatabaseRead,
        UpdateContext: resourceDatabaseUpdate,
        DeleteContext: resourceDatabaseDelete,
        
        Importer: &schema.ResourceImporter{
            StateContext: schema.ImportStatePassthroughContext,
        },
        
        Schema: map[string]*schema.Schema{
            "name": {
                Type:     schema.TypeString,
                Required: true,
                ForceNew: true,
            },
            "engine": {
                Type:     schema.TypeString,
                Required: true,
                ValidateFunc: validation.StringInSlice([]string{
                    "mysql", "postgres", "mongodb",
                }, false),
            },
            "version": {
                Type:     schema.TypeString,
                Required: true,
            },
            "size": {
                Type:     schema.TypeString,
                Optional: true,
                Default:  "small",
            },
            "backup_enabled": {
                Type:     schema.TypeBool,
                Optional: true,
                Default:  true,
            },
            "endpoint": {
                Type:     schema.TypeString,
                Computed: true,
            },
            "status": {
                Type:     schema.TypeString,
                Computed: true,
            },
        },
        
        Timeouts: &schema.ResourceTimeout{
            Create: schema.DefaultTimeout(30 * time.Minute),
            Update: schema.DefaultTimeout(30 * time.Minute),
            Delete: schema.DefaultTimeout(10 * time.Minute),
        },
    }
}

func resourceDatabaseCreate(ctx context.Context, d *schema.ResourceData, m interface{}) diag.Diagnostics {
    client := m.(*CustomClient)
    
    req := &CreateDatabaseRequest{
        Name:          d.Get("name").(string),
        Engine:        d.Get("engine").(string),
        Version:       d.Get("version").(string),
        Size:          d.Get("size").(string),
        BackupEnabled: d.Get("backup_enabled").(bool),
    }
    
    db, err := client.CreateDatabase(ctx, req)
    if err != nil {
        return diag.FromErr(err)
    }
    
    d.SetId(db.ID)
    
    // Wait for database to be ready
    stateConf := &resource.StateChangeConf{
        Pending: []string{"creating", "provisioning"},
        Target:  []string{"available"},
        Refresh: databaseStateRefreshFunc(client, db.ID),
        Timeout: d.Timeout(schema.TimeoutCreate),
        Delay:   10 * time.Second,
    }
    
    _, err = stateConf.WaitForStateContext(ctx)
    if err != nil {
        return diag.FromErr(err)
    }
    
    return resourceDatabaseRead(ctx, d, m)
}
```

## Best Practices

1. **Module Design**: Create small, focused, reusable modules
2. **State Management**: Use remote state with locking
3. **Security**: Never commit secrets, use AWS Secrets Manager/Vault
4. **Testing**: Write comprehensive tests with Terratest
5. **Documentation**: Document modules with examples and README files

## Terraform Patterns

- Workspace isolation for environments
- Module composition for complex infrastructure
- Data sources for dynamic configuration
- Conditional resources with count/for_each
- Dynamic blocks for flexible configuration

## Related Agents

- **aws-architect**: For AWS-specific best practices
- **kubernetes-operator**: For K8s infrastructure
- **ansible-expert**: For configuration management
- **security-specialist**: For infrastructure security