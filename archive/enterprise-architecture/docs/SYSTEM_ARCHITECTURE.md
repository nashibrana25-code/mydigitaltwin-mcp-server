# System Architecture - Digital Twin MCP Server

## Executive Summary

The Digital Twin MCP Server is designed as a cloud-native, microservices-based architecture that enables secure, scalable, and reliable professional profile querying across multiple platforms.

## Architecture Principles

### 1. **Cloud-Native Design**
- Containerized services
- Stateless application layer
- Managed cloud services
- Infrastructure as Code (IaC)

### 2. **Microservices Pattern**
- Loosely coupled services
- Independent deployment
- Technology diversity
- Fault isolation

### 3. **Security by Design**
- Zero-trust architecture
- Least privilege access
- Defense in depth
- Encryption everywhere

### 4. **Observability First**
- Comprehensive logging
- Distributed tracing
- Metrics collection
- Real-time alerting

---

## Detailed Architecture

### Layer 1: Client Layer

**Supported Clients:**

```typescript
// VS Code MCP Client
{
  "mcpServers": {
    "digital-twin": {
      "command": "node",
      "args": ["server.js"],
      "env": {
        "API_ENDPOINT": "https://api.digitaltwin.com/mcp",
        "API_KEY": "${DIGITAL_TWIN_API_KEY}"
      }
    }
  }
}

// Claude Desktop Config
{
  "mcpServers": {
    "digital-twin": {
      "command": "node",
      "args": ["C:/path/to/server.js"]
    }
  }
}

// Web Client (REST API)
fetch('https://api.digitaltwin.com/v1/query', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${JWT_TOKEN}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    question: "What are your technical skills?"
  })
});

// Mobile SDK
const client = new DigitalTwinClient({
  apiKey: process.env.API_KEY,
  region: 'us-east-1'
});
await client.query("Tell me about your experience");
```

**Client Authentication:**
- OAuth 2.0 for web/mobile clients
- API keys for VS Code/Claude Desktop
- JWT tokens for session management
- Refresh token rotation

---

### Layer 2: API Gateway

**Technology Stack:**
- AWS API Gateway / Kong / Nginx
- Rate limiting: 100 req/min per user
- Request validation
- SSL/TLS termination

**Gateway Responsibilities:**

```yaml
api_gateway:
  endpoints:
    - path: /v1/query
      methods: [POST]
      auth: required
      rate_limit: 100/min
      
    - path: /v1/search
      methods: [POST]
      auth: required
      rate_limit: 50/min
      
    - path: /mcp/*
      methods: [POST, OPTIONS]
      auth: required
      rate_limit: 200/min
      
  cors:
    allowed_origins:
      - https://app.digitaltwin.com
      - vscode://
      - claude-desktop://
    allowed_methods: [GET, POST, OPTIONS]
    allowed_headers: [Authorization, Content-Type]
    
  security:
    ssl_protocols: [TLSv1.2, TLSv1.3]
    cipher_suites: [TLS_AES_256_GCM_SHA384, ...]
    certificate_authority: LetsEncrypt
```

**Rate Limiting Strategy:**

```javascript
// Tiered rate limits
const RATE_LIMITS = {
  free: {
    requests_per_minute: 10,
    requests_per_day: 500,
    concurrent_requests: 2
  },
  professional: {
    requests_per_minute: 100,
    requests_per_day: 10000,
    concurrent_requests: 10
  },
  enterprise: {
    requests_per_minute: 1000,
    requests_per_day: 100000,
    concurrent_requests: 50
  }
};
```

---

### Layer 3: Application Layer (MCP Server Cluster)

**Deployment Architecture:**

```yaml
# Kubernetes Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: digital-twin-mcp-server
spec:
  replicas: 3  # Minimum for high availability
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: digital-twin-mcp
  template:
    metadata:
      labels:
        app: digital-twin-mcp
        version: v1.0.0
    spec:
      containers:
      - name: mcp-server
        image: digitaltwin/mcp-server:1.0.0
        ports:
        - containerPort: 3000
        env:
        - name: UPSTASH_VECTOR_REST_URL
          valueFrom:
            secretKeyRef:
              name: upstash-credentials
              key: url
        - name: GROQ_API_KEY
          valueFrom:
            secretKeyRef:
              name: groq-credentials
              key: api-key
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

**Auto-Scaling Configuration:**

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: digital-twin-mcp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: digital-twin-mcp-server
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
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
```

**Load Balancer Configuration:**

```nginx
upstream mcp_servers {
    least_conn;  # Least connections algorithm
    
    server mcp-server-1:3000 weight=1 max_fails=3 fail_timeout=30s;
    server mcp-server-2:3000 weight=1 max_fails=3 fail_timeout=30s;
    server mcp-server-3:3000 weight=1 max_fails=3 fail_timeout=30s;
    
    keepalive 32;  # Connection pooling
}

server {
    listen 443 ssl http2;
    server_name api.digitaltwin.com;
    
    ssl_certificate /etc/ssl/certs/digitaltwin.crt;
    ssl_certificate_key /etc/ssl/private/digitaltwin.key;
    
    location /api/mcp {
        proxy_pass http://mcp_servers;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Circuit breaker pattern
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503;
        proxy_next_upstream_tries 2;
    }
}
```

---

### Layer 4: Service Layer

#### 4.1 Vector Database (Upstash Vector)

**Configuration:**

```typescript
// Production Upstash Vector Setup
export const vectorConfig = {
  // Primary region
  primary: {
    url: process.env.UPSTASH_VECTOR_REST_URL,
    token: process.env.UPSTASH_VECTOR_REST_TOKEN,
    region: 'us-east-1',
    embedding_model: 'mixedbread-ai/mxbai-embed-large-v1',
    dimensions: 1024,
    similarity: 'COSINE'
  },
  
  // Read replicas for geographic distribution
  replicas: [
    {
      url: process.env.UPSTASH_VECTOR_EU_URL,
      token: process.env.UPSTASH_VECTOR_EU_TOKEN,
      region: 'eu-west-1'
    },
    {
      url: process.env.UPSTASH_VECTOR_ASIA_URL,
      token: process.env.UPSTASH_VECTOR_ASIA_TOKEN,
      region: 'ap-southeast-1'
    }
  ],
  
  // Connection pooling
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000
  },
  
  // Retry strategy
  retry: {
    attempts: 3,
    delay: 1000,
    backoff: 'exponential'
  }
};

// Multi-region query with failover
export async function queryVectorsWithFailover(
  query: string, 
  topK: number = 3
): Promise<VectorQueryResult[]> {
  const regions = [vectorConfig.primary, ...vectorConfig.replicas];
  
  for (const region of regions) {
    try {
      const index = new Index({
        url: region.url,
        token: region.token
      });
      
      const results = await index.query({
        data: query,
        topK,
        includeMetadata: true
      });
      
      // Log successful region
      logger.info(`Query successful in region: ${region.region}`);
      
      return results as VectorQueryResult[];
    } catch (error) {
      logger.warn(`Query failed in ${region.region}, trying next...`, error);
      continue;
    }
  }
  
  throw new Error('All regions failed for vector query');
}
```

**Data Synchronization:**

```typescript
// Profile update synchronization across regions
export async function syncProfileAcrossRegions(
  chunks: ProfileChunk[]
): Promise<SyncResult> {
  const regions = [vectorConfig.primary, ...vectorConfig.replicas];
  const results: SyncResult[] = [];
  
  // Parallel sync to all regions
  const syncPromises = regions.map(async (region) => {
    try {
      const index = new Index({
        url: region.url,
        token: region.token
      });
      
      await index.upsert(chunks.map(chunk => ({
        id: chunk.id,
        data: chunk.text,
        metadata: chunk.metadata
      })));
      
      return {
        region: region.region,
        status: 'success',
        vectorCount: chunks.length
      };
    } catch (error) {
      return {
        region: region.region,
        status: 'failed',
        error: error.message
      };
    }
  });
  
  return await Promise.allSettled(syncPromises);
}
```

#### 4.2 LLM Service (Groq)

**Configuration:**

```typescript
// Production Groq setup with failover
export const llmConfig = {
  primary: {
    apiKey: process.env.GROQ_API_KEY,
    model: 'llama-3.1-8b-instant',
    endpoint: 'https://api.groq.com/openai/v1'
  },
  
  // Fallback LLM providers
  fallbacks: [
    {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-4-turbo-preview'
    },
    {
      provider: 'anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-3-sonnet-20240229'
    }
  ],
  
  // Rate limiting
  rateLimit: {
    maxRequestsPerMinute: 100,
    maxTokensPerMinute: 100000
  },
  
  // Response caching
  cache: {
    enabled: true,
    ttl: 3600, // 1 hour
    maxSize: 1000 // Cache up to 1000 responses
  }
};

// LLM request with caching and fallback
export async function generateResponseWithCache(
  prompt: string,
  systemPrompt: string
): Promise<string> {
  // Check cache first
  const cacheKey = generateCacheKey(prompt, systemPrompt);
  const cached = await cache.get(cacheKey);
  
  if (cached) {
    logger.info('Cache hit for LLM request');
    return cached;
  }
  
  // Try primary provider
  try {
    const response = await groq.chat.completions.create({
      model: llmConfig.primary.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1024
    });
    
    const result = response.choices[0]?.message?.content || '';
    
    // Cache the result
    await cache.set(cacheKey, result, llmConfig.cache.ttl);
    
    return result;
  } catch (error) {
    logger.warn('Primary LLM provider failed, trying fallback...');
    
    // Fallback to alternative providers
    for (const fallback of llmConfig.fallbacks) {
      try {
        const response = await callFallbackLLM(fallback, prompt, systemPrompt);
        await cache.set(cacheKey, response, llmConfig.cache.ttl);
        return response;
      } catch (fallbackError) {
        continue;
      }
    }
    
    throw new Error('All LLM providers failed');
  }
}
```

#### 4.3 Caching Layer (Redis)

```typescript
// Redis cluster configuration
export const cacheConfig = {
  cluster: {
    nodes: [
      { host: 'redis-1.digitaltwin.com', port: 6379 },
      { host: 'redis-2.digitaltwin.com', port: 6379 },
      { host: 'redis-3.digitaltwin.com', port: 6379 }
    ],
    options: {
      enableReadyCheck: true,
      maxRedirections: 16,
      retryDelayOnFailover: 100,
      retryDelayOnClusterDown: 300
    }
  },
  
  // Cache strategies
  strategies: {
    llmResponses: {
      ttl: 3600, // 1 hour
      prefix: 'llm:response:'
    },
    vectorResults: {
      ttl: 1800, // 30 minutes
      prefix: 'vector:result:'
    },
    userSessions: {
      ttl: 86400, // 24 hours
      prefix: 'session:'
    },
    rateLimits: {
      ttl: 60, // 1 minute
      prefix: 'ratelimit:'
    }
  }
};

// Cache implementation
export class CacheManager {
  private redis: Redis.Cluster;
  
  constructor() {
    this.redis = new Redis.Cluster(
      cacheConfig.cluster.nodes,
      cacheConfig.cluster.options
    );
  }
  
  async get(key: string): Promise<string | null> {
    try {
      return await this.redis.get(key);
    } catch (error) {
      logger.error('Cache get error:', error);
      return null; // Fail gracefully
    }
  }
  
  async set(key: string, value: string, ttl: number): Promise<void> {
    try {
      await this.redis.setex(key, ttl, value);
    } catch (error) {
      logger.error('Cache set error:', error);
      // Don't throw - cache failures shouldn't break app
    }
  }
  
  async invalidate(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

---

### Layer 5: Data Layer

#### Profile Data Management

```typescript
// Profile versioning and audit trail
interface ProfileVersion {
  id: string;
  version: number;
  timestamp: Date;
  changes: ProfileChange[];
  modifiedBy: string;
  data: DigitalTwinProfile;
}

interface ProfileChange {
  field: string;
  oldValue: any;
  newValue: any;
  reason: string;
}

export class ProfileManager {
  private versions: ProfileVersion[] = [];
  
  async updateProfile(
    updates: Partial<DigitalTwinProfile>,
    modifiedBy: string,
    reason: string
  ): Promise<ProfileVersion> {
    // Create new version
    const currentVersion = await this.getCurrentVersion();
    const newVersion: ProfileVersion = {
      id: generateId(),
      version: currentVersion.version + 1,
      timestamp: new Date(),
      changes: this.computeChanges(currentVersion.data, updates),
      modifiedBy,
      data: { ...currentVersion.data, ...updates }
    };
    
    // Save to version history
    await this.saveVersion(newVersion);
    
    // Update vector database
    await this.syncToVectorDB(newVersion.data);
    
    // Invalidate caches
    await cache.invalidate('vector:result:*');
    
    // Audit log
    await this.logAudit({
      action: 'profile_update',
      version: newVersion.version,
      changes: newVersion.changes,
      timestamp: newVersion.timestamp,
      user: modifiedBy
    });
    
    return newVersion;
  }
  
  async rollback(toVersion: number): Promise<ProfileVersion> {
    const version = await this.getVersion(toVersion);
    if (!version) {
      throw new Error(`Version ${toVersion} not found`);
    }
    
    // Restore profile data
    await this.syncToVectorDB(version.data);
    
    // Audit log
    await this.logAudit({
      action: 'profile_rollback',
      fromVersion: await this.getCurrentVersion().version,
      toVersion: version.version,
      timestamp: new Date()
    });
    
    return version;
  }
}
```

---

## Cross-Platform Data Synchronization

### Sync Strategy

```typescript
// Multi-platform sync coordinator
export class SyncCoordinator {
  async syncAcrossPlatforms(profileUpdate: ProfileUpdate): Promise<SyncResult> {
    const platforms = ['vscode', 'claude-desktop', 'web', 'mobile'];
    
    // Parallel sync to all platforms
    const syncTasks = platforms.map(platform => 
      this.syncToPlatform(platform, profileUpdate)
    );
    
    const results = await Promise.allSettled(syncTasks);
    
    return {
      success: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      details: results
    };
  }
  
  private async syncToPlatform(
    platform: string, 
    update: ProfileUpdate
  ): Promise<void> {
    switch (platform) {
      case 'vscode':
        await this.notifyVSCodeClients(update);
        break;
      case 'claude-desktop':
        await this.notifyClaudeClients(update);
        break;
      case 'web':
        await this.broadcastWebSocketUpdate(update);
        break;
      case 'mobile':
        await this.sendPushNotification(update);
        break;
    }
  }
}
```

---

## Performance Optimization

### Response Time Targets

| Operation | Target | P95 | P99 |
|-----------|--------|-----|-----|
| Vector search | < 100ms | 150ms | 200ms |
| LLM generation | < 500ms | 800ms | 1200ms |
| Cache hit | < 10ms | 15ms | 20ms |
| Full query (cached context) | < 200ms | 300ms | 400ms |
| Full query (cold) | < 1000ms | 1500ms | 2000ms |

### Optimization Strategies

1. **Connection Pooling**: Reuse database connections
2. **Request Batching**: Batch vector queries when possible
3. **Streaming Responses**: Stream LLM output for better UX
4. **Edge Caching**: Deploy to CDN edge locations
5. **Lazy Loading**: Load profile data incrementally

---

## Disaster Recovery

### Backup Strategy

```yaml
backup_policy:
  vector_database:
    frequency: hourly
    retention: 30_days
    storage: AWS S3 (versioned, cross-region)
    
  profile_versions:
    frequency: real-time
    retention: 90_days
    storage: PostgreSQL (replicated)
    
  configuration:
    frequency: on_change
    retention: 365_days
    storage: Git repository
    
  audit_logs:
    frequency: real-time
    retention: 7_years
    storage: Write-once-read-many (WORM) storage
```

### Recovery Time Objectives (RTO)

- **Critical services**: 15 minutes
- **Non-critical services**: 1 hour
- **Full system restore**: 4 hours

### Recovery Point Objectives (RPO)

- **Profile data**: 5 minutes
- **Audit logs**: 0 (real-time replication)
- **Cache data**: Acceptable data loss

---

## Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | VS Code, Claude Desktop, Next.js | Client interfaces |
| **API Gateway** | AWS API Gateway / Kong | Request routing, auth |
| **Application** | Node.js, Next.js, TypeScript | MCP server logic |
| **Container** | Docker, Kubernetes | Orchestration |
| **Vector DB** | Upstash Vector | Profile search |
| **LLM** | Groq (Llama 3.1) | Response generation |
| **Cache** | Redis Cluster | Performance optimization |
| **Session Store** | Redis | User sessions |
| **Database** | PostgreSQL | Profile versions, audit logs |
| **Object Storage** | AWS S3 | Backups, static assets |
| **CDN** | CloudFlare / AWS CloudFront | Edge caching |
| **Monitoring** | Datadog / New Relic | Observability |
| **Logging** | ELK Stack / CloudWatch | Centralized logs |
| **Secrets** | AWS Secrets Manager / Vault | Credential management |
| **CI/CD** | GitHub Actions | Automation |
| **IaC** | Terraform / Pulumi | Infrastructure provisioning |

---

**Next:** [Deployment Guide](DEPLOYMENT_GUIDE.md) | [Security Architecture](SECURITY_ARCHITECTURE.md)
