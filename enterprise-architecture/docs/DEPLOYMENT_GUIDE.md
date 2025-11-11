# Deployment Guide - Digital Twin MCP Server

## Overview

Step-by-step guide for deploying the Digital Twin MCP Server to production environments with security, scalability, and reliability.

---

## Prerequisites

### Required Tools
- Docker (v20.10+)
- Kubernetes (v1.24+) / kubectl
- Helm (v3.0+)
- Terraform (v1.0+) or Pulumi
- Node.js (v18+)
- pnpm (v8+)

### Cloud Accounts
- AWS / GCP / Azure account
- Upstash Vector database
- Groq API key
- Domain name and SSL certificates
- Monitoring services (Datadog, Sentry, etc.)

---

## Deployment Options

### 1. Docker Standalone (Development/Testing)
### 2. Kubernetes (Production - Recommended)
### 3. Serverless (Vercel/Railway)

---

## Option 1: Docker Deployment

### Build Docker Image

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY .npmrc ./

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Production image
FROM node:18-alpine

WORKDIR /app

# Copy built assets
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/public ./public

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {if (r.statusCode !== 200) throw new Error('Health check failed')})"

# Expose port
EXPOSE 3000

# Start application
CMD ["node_modules/.bin/next", "start"]
```

### Docker Compose (Multi-Container)

```yaml
# docker-compose.yml
version: '3.8'

services:
  mcp-server:
    build: .
    image: digitaltwin/mcp-server:latest
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      UPSTASH_VECTOR_REST_URL: ${UPSTASH_VECTOR_REST_URL}
      UPSTASH_VECTOR_REST_TOKEN: ${UPSTASH_VECTOR_REST_TOKEN}
      GROQ_API_KEY: ${GROQ_API_KEY}
      JWT_SECRET: ${JWT_SECRET}
      REDIS_URL: redis://redis:6379
    depends_on:
      - redis
    networks:
      - digitaltwin
    restart: unless-stopped
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '0.5'
          memory: 1G
        reservations:
          cpus: '0.25'
          memory: 512M

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    networks:
      - digitaltwin
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - mcp-server
    networks:
      - digitaltwin
    restart: unless-stopped

volumes:
  redis-data:

networks:
  digitaltwin:
    driver: bridge
```

### Deploy with Docker Compose

```bash
# Build and start services
docker-compose up -d --build

# View logs
docker-compose logs -f mcp-server

# Scale services
docker-compose up -d --scale mcp-server=5

# Stop services
docker-compose down
```

---

## Option 2: Kubernetes Deployment (Recommended)

### Namespace Creation

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: digitaltwin-production
  labels:
    name: digitaltwin-production
    environment: production
```

### Secrets Management

```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: digitaltwin-secrets
  namespace: digitaltwin-production
type: Opaque
stringData:
  upstash-vector-url: ${UPSTASH_VECTOR_REST_URL}
  upstash-vector-token: ${UPSTASH_VECTOR_REST_TOKEN}
  groq-api-key: ${GROQ_API_KEY}
  jwt-secret: ${JWT_SECRET}
  redis-password: ${REDIS_PASSWORD}
```

### ConfigMap

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: digitaltwin-config
  namespace: digitaltwin-production
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  PORT: "3000"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
```

### Deployment Manifest

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-server
  namespace: digitaltwin-production
  labels:
    app: mcp-server
    version: v1.0.0
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: mcp-server
  template:
    metadata:
      labels:
        app: mcp-server
        version: v1.0.0
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: mcp-server-sa
      containers:
      - name: mcp-server
        image: digitaltwin/mcp-server:1.0.0
        imagePullPolicy: IfNotPresent
        ports:
        - name: http
          containerPort: 3000
          protocol: TCP
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: digitaltwin-config
              key: NODE_ENV
        - name: UPSTASH_VECTOR_REST_URL
          valueFrom:
            secretKeyRef:
              name: digitaltwin-secrets
              key: upstash-vector-url
        - name: UPSTASH_VECTOR_REST_TOKEN
          valueFrom:
            secretKeyRef:
              name: digitaltwin-secrets
              key: upstash-vector-token
        - name: GROQ_API_KEY
          valueFrom:
            secretKeyRef:
              name: digitaltwin-secrets
              key: groq-api-key
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: digitaltwin-secrets
              key: jwt-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health/liveness
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/readiness
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
        securityContext:
          runAsNonRoot: true
          runAsUser: 1000
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - mcp-server
              topologyKey: kubernetes.io/hostname
```

### Service Manifest

```yaml
# service.yaml
apiVersion: v1
kind: Service
metadata:
  name: mcp-server-service
  namespace: digitaltwin-production
  labels:
    app: mcp-server
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 3000
    protocol: TCP
    name: http
  selector:
    app: mcp-server
  sessionAffinity: None
```

### Ingress with TLS

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mcp-server-ingress
  namespace: digitaltwin-production
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
spec:
  tls:
  - hosts:
    - api.digitaltwin.com
    secretName: digitaltwin-tls
  rules:
  - host: api.digitaltwin.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: mcp-server-service
            port:
              number: 80
```

### HorizontalPodAutoscaler

```yaml
# hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mcp-server-hpa
  namespace: digitaltwin-production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mcp-server
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
```

### Deploy to Kubernetes

```bash
# Apply namespace
kubectl apply -f namespace.yaml

# Create secrets (use sealed-secrets in production)
kubectl apply -f secrets.yaml

# Apply configmap
kubectl apply -f configmap.yaml

# Deploy application
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml

# Verify deployment
kubectl get all -n digitaltwin-production

# Check logs
kubectl logs -f deployment/mcp-server -n digitaltwin-production

# Port forward for testing
kubectl port-forward svc/mcp-server-service 3000:80 -n digitaltwin-production
```

---

## Option 3: Serverless Deployment

### Vercel Deployment

```json
// vercel.json
{
  "version": 2,
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "env": {
    "UPSTASH_VECTOR_REST_URL": "@upstash-vector-url",
    "UPSTASH_VECTOR_REST_TOKEN": "@upstash-vector-token",
    "GROQ_API_KEY": "@groq-api-key"
  },
  "regions": ["iad1", "sfo1", "lhr1"],
  "functions": {
    "app/api/**/*": {
      "maxDuration": 30,
      "memory": 1024
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Authorization, Content-Type"
        }
      ]
    }
  ]
}
```

```bash
# Install Vercel CLI
pnpm install -g vercel

# Login
vercel login

# Deploy to production
vercel --prod

# Set environment variables
vercel env add UPSTASH_VECTOR_REST_URL production
vercel env add UPSTASH_VECTOR_REST_TOKEN production
vercel env add GROQ_API_KEY production
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 8
    
    - name: Install dependencies
      run: pnpm install --frozen-lockfile
    
    - name: Run tests
      run: pnpm test
    
    - name: Run linter
      run: pnpm lint

  build:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
    - uses: actions/checkout@v3
    
    - name: Log in to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ env.REGISTRY }}
        username: ${{ github.actor }}
        password: ${{ secrets.GITHUB_TOKEN }}
    
    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v4
      with:
        images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=semver,pattern={{version}}
          type=sha
    
    - name: Build and push Docker image
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - uses: actions/checkout@v3
    
    - name: Configure kubectl
      uses: azure/k8s-set-context@v3
      with:
        method: kubeconfig
        kubeconfig: ${{ secrets.KUBE_CONFIG }}
    
    - name: Deploy to Kubernetes
      run: |
        kubectl set image deployment/mcp-server \
          mcp-server=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:sha-${GITHUB_SHA::7} \
          -n digitaltwin-production
        
        kubectl rollout status deployment/mcp-server -n digitaltwin-production
    
    - name: Notify deployment
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        text: 'Deployment to production completed'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Infrastructure as Code

### Terraform (AWS)

```hcl
# main.tf
terraform {
  required_version = ">= 1.0"
  
  backend "s3" {
    bucket = "digitaltwin-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# EKS Cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"
  
  cluster_name    = "digitaltwin-prod"
  cluster_version = "1.27"
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  eks_managed_node_groups = {
    main = {
      min_size     = 3
      max_size     = 20
      desired_size = 5
      
      instance_types = ["t3.medium"]
      capacity_type  = "SPOT"
    }
  }
}

# VPC
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"
  
  name = "digitaltwin-vpc"
  cidr = "10.0.0.0/16"
  
  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  
  enable_nat_gateway = true
  single_nat_gateway = false
}

# RDS PostgreSQL
resource "aws_db_instance" "main" {
  identifier     = "digitaltwin-db"
  engine         = "postgres"
  engine_version = "15.3"
  instance_class = "db.t3.medium"
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_encrypted     = true
  
  db_name  = "digitaltwin"
  username = var.db_username
  password = var.db_password
  
  multi_az               = true
  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"
  
  skip_final_snapshot = false
  final_snapshot_identifier = "digitaltwin-final-snapshot"
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "digitaltwin-redis"
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = "cache.t3.medium"
  num_cache_nodes      = 3
  parameter_group_name = "default.redis7"
  port                 = 6379
  
  subnet_group_name  = aws_elasticache_subnet_group.redis.name
  security_group_ids = [aws_security_group.redis.id]
}
```

---

## Post-Deployment Checklist

### Verification Steps

```bash
# 1. Check pods are running
kubectl get pods -n digitaltwin-production

# 2. Verify health checks
curl https://api.digitaltwin.com/health

# 3. Test MCP endpoint
curl -X POST https://api.digitaltwin.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# 4. Check logs for errors
kubectl logs -f deployment/mcp-server -n digitaltwin-production

# 5. Verify metrics endpoint
curl https://api.digitaltwin.com/metrics

# 6. Test auto-scaling
kubectl get hpa -n digitaltwin-production

# 7. Check SSL certificate
curl -vI https://api.digitaltwin.com 2>&1 | grep -A 10 "SSL connection"
```

### Security Verification

```bash
# Run security scan on Docker image
docker scan digitaltwin/mcp-server:latest

# Check for vulnerabilities
trivy image digitaltwin/mcp-server:latest

# Verify RBAC
kubectl auth can-i --list --as=system:serviceaccount:digitaltwin-production:mcp-server-sa
```

---

## Monitoring Setup

```bash
# Install Prometheus
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring

# Install Grafana dashboards
kubectl apply -f monitoring/dashboards/

# Verify metrics collection
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090
# Open http://localhost:9090
```

---

## Rollback Procedure

```bash
# Rollback to previous version
kubectl rollout undo deployment/mcp-server -n digitaltwin-production

# Rollback to specific revision
kubectl rollout undo deployment/mcp-server --to-revision=3 -n digitaltwin-production

# Check rollout history
kubectl rollout history deployment/mcp-server -n digitaltwin-production
```

---

## Disaster Recovery

### Backup Strategy

```bash
# Database backup
aws rds create-db-snapshot \
  --db-instance-identifier digitaltwin-db \
  --db-snapshot-identifier digitaltwin-backup-$(date +%Y%m%d)

# Kubernetes resources backup (Velero)
velero backup create digitaltwin-backup \
  --include-namespaces digitaltwin-production

# Verify backup
velero backup describe digitaltwin-backup
```

### Restore Procedure

```bash
# Restore from backup
velero restore create --from-backup digitaltwin-backup

# Verify restoration
kubectl get all -n digitaltwin-production
```

---

**Status:** Production Deployment Guide Complete ✅
