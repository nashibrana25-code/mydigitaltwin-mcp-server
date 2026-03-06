# Scalability Patterns - Digital Twin MCP Server

## Overview

This document outlines the scalability strategies and architectural patterns that enable the Digital Twin MCP Server to handle high-volume professional interactions while maintaining performance and reliability.

---

## Scalability Principles

### 1. **Horizontal Scalability**
- Scale by adding more instances
- Stateless application design
- No single point of failure
- Linear performance gains

### 2. **Vertical Scalability**
- Optimize resource utilization
- Right-size compute resources
- Memory and CPU efficiency
- Cost-effective scaling

### 3. **Elastic Scaling**
- Auto-scale based on demand
- Predictive scaling for known patterns
- Cost optimization through scheduling
- Burst capacity for peak loads

---

## Application Layer Scaling

### Stateless Architecture

```typescript
// Stateless MCP server design
export class MCPServer {
  // NO instance state stored here
  // All state in external stores (Redis, DB)
  
  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    // Extract user context from JWT token
    const user = await this.auth.verifyToken(request.token);
    
    // Load session from Redis (shared across all instances)
    const session = await this.sessionStore.get(user.id);
    
    // Process request (stateless logic)
    const result = await this.processQuery(request.query, user, session);
    
    // Update session in Redis
    await this.sessionStore.set(user.id, {
      ...session,
      lastQuery: request.query,
      queryCount: session.queryCount + 1
    });
    
    return result;
  }
}
```

### Load Balancing Strategies

```yaml
# Nginx load balancer configuration
http {
  upstream mcp_backend {
    # Load balancing algorithm: Least connections
    least_conn;
    
    # Server pool with health checks
    server mcp-server-1:3000 weight=1 max_fails=3 fail_timeout=30s;
    server mcp-server-2:3000 weight=1 max_fails=3 fail_timeout=30s;
    server mcp-server-3:3000 weight=1 max_fails=3 fail_timeout=30s;
    server mcp-server-4:3000 weight=1 max_fails=3 fail_timeout=30s backup;
    
    # Connection pooling
    keepalive 64;
    keepalive_requests 100;
    keepalive_timeout 60s;
  }
  
  server {
    listen 443 ssl http2;
    server_name api.digitaltwin.com;
    
    # Connection limits
    limit_conn_zone $binary_remote_addr zone=addr:10m;
    limit_conn addr 10; # Max 10 concurrent connections per IP
    
    location /api/mcp {
      proxy_pass http://mcp_backend;
      
      # Sticky sessions (if needed for WebSocket)
      ip_hash;
      
      # Request buffering
      proxy_buffering on;
      proxy_buffer_size 4k;
      proxy_buffers 8 4k;
      
      # Timeouts
      proxy_connect_timeout 5s;
      proxy_send_timeout 60s;
      proxy_read_timeout 60s;
      
      # Headers
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_set_header X-Request-ID $request_id;
      
      # Health check endpoint
      proxy_next_upstream error timeout http_500 http_502 http_503;
    }
  }
}
```

### Auto-Scaling Configuration

```yaml
# Kubernetes Horizontal Pod Autoscaler
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mcp-server-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mcp-server
  
  # Scaling bounds
  minReplicas: 3  # Minimum for high availability
  maxReplicas: 50 # Maximum based on cost limits
  
  # Scaling behavior
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100  # Double the pods
        periodSeconds: 60
      - type: Pods
        value: 5    # Or add 5 pods
        periodSeconds: 60
      selectPolicy: Max  # Use the most aggressive policy
    
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 minutes before scaling down
      policies:
      - type: Percent
        value: 50   # Remove 50% of pods
        periodSeconds: 60
      selectPolicy: Min
  
  # Metrics for scaling decisions
  metrics:
  # CPU-based scaling
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70  # Scale up at 70% CPU
  
  # Memory-based scaling
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80  # Scale up at 80% memory
  
  # Custom metric: Requests per second
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"  # Scale up at 1000 req/s per pod
  
  # Custom metric: Query latency
  - type: Pods
    pods:
      metric:
        name: query_latency_p95
      target:
        type: AverageValue
        averageValue: "500m"  # Scale up if P95 > 500ms
```

---

## Database Scaling

### Vector Database (Upstash Vector)

```typescript
// Multi-region vector database setup
export class ScalableVectorDB {
  private regions: VectorDBRegion[];
  
  constructor() {
    this.regions = [
      {
        name: 'us-east-1',
        endpoint: process.env.UPSTASH_VECTOR_US_URL!,
        token: process.env.UPSTASH_VECTOR_US_TOKEN!,
        priority: 1,
        readReplicas: 3
      },
      {
        name: 'eu-west-1',
        endpoint: process.env.UPSTASH_VECTOR_EU_URL!,
        token: process.env.UPSTASH_VECTOR_EU_TOKEN!,
        priority: 2,
        readReplicas: 2
      },
      {
        name: 'ap-southeast-1',
        endpoint: process.env.UPSTASH_VECTOR_ASIA_URL!,
        token: process.env.UPSTASH_VECTOR_ASIA_TOKEN!,
        priority: 3,
        readReplicas: 2
      }
    ];
  }
  
  // Geographic routing: Query nearest region
  async query(
    text: string, 
    topK: number,
    userRegion?: string
  ): Promise<VectorResult[]> {
    const region = this.selectOptimalRegion(userRegion);
    
    try {
      return await this.queryRegion(region, text, topK);
    } catch (error) {
      // Failover to next region
      console.warn(`Region ${region.name} failed, trying failover...`);
      return await this.queryWithFailover(text, topK, region);
    }
  }
  
  // Write to primary, replicate to others
  async upsert(vectors: Vector[]): Promise<void> {
    const primary = this.regions[0];
    
    // Write to primary region
    await this.upsertToRegion(primary, vectors);
    
    // Async replication to other regions
    const replicationPromises = this.regions.slice(1).map(region =>
      this.replicateToRegion(region, vectors).catch(err => {
        console.error(`Replication to ${region.name} failed:`, err);
        // Don't fail the whole operation - eventual consistency
      })
    );
    
    // Don't wait for replication to complete
    Promise.all(replicationPromises);
  }
  
  private selectOptimalRegion(userRegion?: string): VectorDBRegion {
    if (userRegion) {
      const region = this.regions.find(r => r.name === userRegion);
      if (region) return region;
    }
    
    // Default to highest priority (lowest number)
    return this.regions.sort((a, b) => a.priority - b.priority)[0];
  }
  
  private async queryWithFailover(
    text: string,
    topK: number,
    excludeRegion: VectorDBRegion
  ): Promise<VectorResult[]> {
    const availableRegions = this.regions.filter(r => r !== excludeRegion);
    
    for (const region of availableRegions) {
      try {
        return await this.queryRegion(region, text, topK);
      } catch (error) {
        continue; // Try next region
      }
    }
    
    throw new Error('All vector database regions unavailable');
  }
}
```

### Read Replicas Pattern

```typescript
// Read-write splitting for relational data
export class DatabasePool {
  private primaryDB: Database;
  private readReplicas: Database[];
  private currentReplicaIndex: number = 0;
  
  constructor() {
    this.primaryDB = new Database({
      host: process.env.DB_PRIMARY_HOST,
      port: 5432,
      database: 'digitaltwin',
      max: 20, // Connection pool size
      idleTimeoutMillis: 30000
    });
    
    this.readReplicas = [
      new Database({
        host: process.env.DB_REPLICA_1_HOST,
        port: 5432,
        database: 'digitaltwin',
        max: 50 // More connections for reads
      }),
      new Database({
        host: process.env.DB_REPLICA_2_HOST,
        port: 5432,
        database: 'digitaltwin',
        max: 50
      }),
      new Database({
        host: process.env.DB_REPLICA_3_HOST,
        port: 5432,
        database: 'digitaltwin',
        max: 50
      })
    ];
  }
  
  // All writes go to primary
  async write(query: string, params: any[]): Promise<any> {
    return await this.primaryDB.query(query, params);
  }
  
  // Reads distributed across replicas (round-robin)
  async read(query: string, params: any[]): Promise<any> {
    const replica = this.selectReadReplica();
    
    try {
      return await replica.query(query, params);
    } catch (error) {
      // Failover to primary if replica fails
      console.warn('Read replica failed, using primary', error);
      return await this.primaryDB.query(query, params);
    }
  }
  
  private selectReadReplica(): Database {
    // Round-robin load balancing
    const replica = this.readReplicas[this.currentReplicaIndex];
    this.currentReplicaIndex = 
      (this.currentReplicaIndex + 1) % this.readReplicas.length;
    return replica;
  }
}
```

---

## Caching Strategies

### Multi-Layer Caching

```typescript
// L1: In-memory cache (fastest, smallest)
// L2: Redis cache (fast, distributed)
// L3: Database (slow, authoritative)

export class MultiLayerCache {
  private l1Cache: LRUCache;      // In-process memory
  private l2Cache: RedisClient;   // Distributed cache
  private database: Database;     // Source of truth
  
  constructor() {
    this.l1Cache = new LRUCache({
      max: 1000,           // Max 1000 items
      maxAge: 5 * 60 * 1000  // 5 minute TTL
    });
    
    this.l2Cache = new RedisClient({
      cluster: process.env.REDIS_CLUSTER_NODES,
      keyPrefix: 'cache:'
    });
  }
  
  async get(key: string): Promise<any> {
    // Try L1 cache first (in-memory)
    const l1Result = this.l1Cache.get(key);
    if (l1Result !== undefined) {
      this.metrics.increment('cache.l1.hit');
      return l1Result;
    }
    
    // Try L2 cache (Redis)
    const l2Result = await this.l2Cache.get(key);
    if (l2Result !== null) {
      this.metrics.increment('cache.l2.hit');
      // Populate L1 cache
      this.l1Cache.set(key, l2Result);
      return JSON.parse(l2Result);
    }
    
    // Cache miss - fetch from database
    this.metrics.increment('cache.miss');
    const dbResult = await this.database.query(key);
    
    // Populate both cache layers
    await this.set(key, dbResult);
    
    return dbResult;
  }
  
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    // Write to L1 cache
    this.l1Cache.set(key, value);
    
    // Write to L2 cache
    await this.l2Cache.setex(key, ttl, JSON.stringify(value));
  }
  
  async invalidate(pattern: string): Promise<void> {
    // Clear L1 cache
    this.l1Cache.reset();
    
    // Clear matching keys in L2
    const keys = await this.l2Cache.keys(pattern);
    if (keys.length > 0) {
      await this.l2Cache.del(...keys);
    }
  }
}
```

### Cache Warming Strategy

```typescript
// Pre-populate cache with frequently accessed data
export class CacheWarmer {
  private cache: MultiLayerCache;
  
  // Warm cache on server startup
  async warmCache(): Promise<void> {
    console.log('Starting cache warming...');
    
    // Common profile queries
    const commonQueries = [
      'What are your technical skills?',
      'Tell me about your experience',
      'What is your educational background?',
      'What are your career goals?'
    ];
    
    for (const query of commonQueries) {
      try {
        const result = await this.vectorDB.query(query, 3);
        await this.cache.set(`query:${query}`, result, 3600);
      } catch (error) {
        console.error(`Failed to warm cache for: ${query}`, error);
      }
    }
    
    console.log('Cache warming complete');
  }
  
  // Scheduled cache refresh (every hour)
  async refreshCache(): Promise<void> {
    await this.cache.invalidate('query:*');
    await this.warmCache();
  }
}
```

---

## Connection Pooling

### Database Connection Pool

```typescript
// PostgreSQL connection pooling
import { Pool } from 'pg';

export const dbPool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  // Pool configuration
  min: 5,              // Minimum connections
  max: 50,             // Maximum connections
  idleTimeoutMillis: 30000,    // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Wait max 5s for connection
  
  // Connection lifecycle
  allowExitOnIdle: false,
  
  // Prepared statements
  statement_timeout: 30000,  // 30s query timeout
  
  // SSL for production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/etc/ssl/certs/ca.crt')
  } : false
});

// Monitor pool health
dbPool.on('connect', client => {
  console.log('New database connection established');
});

dbPool.on('error', (err, client) => {
  console.error('Unexpected database pool error', err);
  // Alert monitoring system
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Closing database pool...');
  await dbPool.end();
  process.exit(0);
});
```

### HTTP Connection Pool

```typescript
// HTTP connection pooling for external APIs
import http from 'http';
import https from 'https';

export const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,       // Max concurrent connections
  maxFreeSockets: 10,   // Keep 10 idle connections
  timeout: 60000        // 60s timeout
});

export const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000
});

// Use in API clients
const groqClient = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  httpAgent: httpsAgent  // Reuse connections
});
```

---

## Asynchronous Processing

### Message Queue Pattern

```typescript
// Job queue for asynchronous tasks
import Bull from 'bull';

export const jobQueues = {
  // Profile embedding queue
  embedding: new Bull('profile-embedding', {
    redis: {
      host: process.env.REDIS_HOST,
      port: 6379,
      password: process.env.REDIS_PASSWORD
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 100,  // Keep last 100 completed jobs
      removeOnFail: 1000      // Keep last 1000 failed jobs
    }
  }),
  
  // Analytics queue
  analytics: new Bull('analytics', {
    redis: process.env.REDIS_URL,
    defaultJobOptions: {
      attempts: 5,
      priority: 3  // Lower priority than critical tasks
    }
  }),
  
  // Notification queue
  notifications: new Bull('notifications', {
    redis: process.env.REDIS_URL,
    defaultJobOptions: {
      attempts: 2,
      removeOnComplete: true
    }
  })
};

// Profile embedding worker
jobQueues.embedding.process(5, async (job) => {  // Process 5 jobs concurrently
  const { userId, profileData } = job.data;
  
  console.log(`Processing embedding for user ${userId}`);
  
  try {
    // Generate embeddings
    const chunks = chunkProfile(profileData);
    const embeddings = await generateEmbeddings(chunks);
    
    // Upload to vector database
    await vectorDB.upsert(embeddings);
    
    // Update job progress
    job.progress(100);
    
    return { success: true, vectorCount: embeddings.length };
  } catch (error) {
    console.error(`Embedding job failed for user ${userId}:`, error);
    throw error;  // Will trigger retry
  }
});

// Queue monitoring
jobQueues.embedding.on('completed', (job, result) => {
  console.log(`Embedding job ${job.id} completed:`, result);
});

jobQueues.embedding.on('failed', (job, err) => {
  console.error(`Embedding job ${job.id} failed:`, err);
  // Alert monitoring system
});
```

### Event-Driven Architecture

```typescript
// Event emitter for decoupled processing
import { EventEmitter } from 'events';

export class DigitalTwinEvents extends EventEmitter {
  // Event types
  static readonly PROFILE_UPDATED = 'profile:updated';
  static readonly QUERY_EXECUTED = 'query:executed';
  static readonly USER_REGISTERED = 'user:registered';
}

export const events = new DigitalTwinEvents();

// Event handlers (async, non-blocking)
events.on(DigitalTwinEvents.PROFILE_UPDATED, async (data) => {
  const { userId, changes } = data;
  
  // Asynchronously re-embed profile
  await jobQueues.embedding.add({
    userId,
    profileData: changes
  });
  
  // Invalidate caches
  await cache.invalidate(`profile:${userId}:*`);
  
  // Send analytics event
  await analytics.track('profile_updated', {
    userId,
    fields: Object.keys(changes)
  });
});

events.on(DigitalTwinEvents.QUERY_EXECUTED, async (data) => {
  const { userId, query, results, latency } = data;
  
  // Log to analytics (non-blocking)
  setImmediate(async () => {
    await analytics.track('query', {
      userId,
      query,
      resultCount: results.length,
      latency
    });
  });
  
  // Update user recommendations
  await jobQueues.analytics.add({
    type: 'update_recommendations',
    userId,
    query
  });
});
```

---

## Geographic Distribution

### CDN for Static Assets

```typescript
// CloudFlare CDN configuration
export const cdnConfig = {
  zones: [
    {
      name: 'digitaltwin-static',
      urls: [
        'https://static.digitaltwin.com',
        'https://cdn.digitaltwin.com'
      ],
      settings: {
        caching: {
          browser_ttl: 3600,      // 1 hour
          edge_ttl: 86400,        // 24 hours
          always_online: true
        },
        performance: {
          minify: {
            js: true,
            css: true,
            html: true
          },
          brotli: true,
          http3: true
        },
        security: {
          ssl: 'strict',
          min_tls_version: '1.2',
          waf: 'enabled'
        }
      }
    }
  ]
};

// Serve static assets from CDN
export function getCDNUrl(assetPath: string): string {
  if (process.env.NODE_ENV === 'production') {
    return `https://cdn.digitaltwin.com${assetPath}`;
  }
  return assetPath;  // Local in development
}
```

### Multi-Region Deployment

```yaml
# Global deployment topology
regions:
  us-east-1:
    primary: true
    services:
      - api-gateway
      - mcp-servers (10 instances)
      - vector-db (primary)
      - postgresql (primary)
      - redis-cluster
    users_served: 40%
    
  eu-west-1:
    primary: false
    services:
      - api-gateway
      - mcp-servers (5 instances)
      - vector-db (read-replica)
      - postgresql (read-replica)
      - redis-cluster
    users_served: 35%
    
  ap-southeast-1:
    primary: false
    services:
      - api-gateway
      - mcp-servers (5 instances)
      - vector-db (read-replica)
      - postgresql (read-replica)
      - redis-cluster
    users_served: 25%

# Traffic routing
traffic_management:
  strategy: geolocation
  failover: automatic
  health_check_interval: 30s
```

---

## Performance Benchmarks

### Target Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **Concurrent Users** | 10,000 | 5,000 | 🟡 Scaling |
| **Requests/Second** | 5,000 | 3,000 | 🟡 Scaling |
| **Vector Query Latency (P95)** | < 150ms | 120ms | ✅ Met |
| **LLM Generation (P95)** | < 800ms | 650ms | ✅ Met |
| **Full Query End-to-End (P95)** | < 1500ms | 1200ms | ✅ Met |
| **Cache Hit Rate** | > 80% | 75% | 🟡 Improving |
| **Database Connection Pool** | < 70% utilization | 45% | ✅ Healthy |

### Load Testing Results

```typescript
// k6 load testing script
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 200 },   // Ramp up to 200 users
    { duration: '5m', target: 200 },   // Stay at 200 users
    { duration: '2m', target: 500 },   // Spike to 500 users
    { duration: '5m', target: 500 },   // Stay at 500 users
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'],  // 95% of requests < 1.5s
    http_req_failed: ['rate<0.01'],     // <1% failure rate
  }
};

export default function () {
  const query = {
    question: 'What are your technical skills?',
    topK: 3
  };
  
  const res = http.post(
    'https://api.digitaltwin.com/v1/query',
    JSON.stringify(query),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${__ENV.API_TOKEN}`
      }
    }
  );
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 1500ms': (r) => r.timings.duration < 1500,
    'has results': (r) => JSON.parse(r.body).results.length > 0
  });
  
  sleep(1);
}
```

---

## Cost Optimization

### Resource Sizing

```yaml
# Kubernetes resource requests and limits
resources:
  mcp-server:
    requests:
      cpu: 250m       # 0.25 CPU cores
      memory: 512Mi   # 512 MB RAM
    limits:
      cpu: 500m       # 0.5 CPU cores max
      memory: 1Gi     # 1 GB RAM max
    
  # Cost per pod: ~$15/month
  # 10 pods: $150/month
  # Auto-scale to 50 pods during peak: $750/month max

# Right-sizing based on actual usage
optimization:
  - Use spot instances for non-critical workloads (70% cost savings)
  - Schedule scale-down during off-peak hours
  - Use reserved instances for baseline capacity (40% discount)
  - Implement request batching to reduce LLM API costs
```

### Efficient Resource Utilization

```typescript
// Request batching to reduce API calls
export class BatchProcessor {
  private batch: Query[] = [];
  private batchSize = 10;
  private batchTimeout = 100; // ms
  private timer: NodeJS.Timeout | null = null;
  
  async addQuery(query: Query): Promise<QueryResult> {
    return new Promise((resolve, reject) => {
      this.batch.push({ query, resolve, reject });
      
      if (this.batch.length >= this.batchSize) {
        this.processBatch();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.processBatch(), this.batchTimeout);
      }
    });
  }
  
  private async processBatch(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    
    const currentBatch = this.batch.splice(0, this.batchSize);
    
    if (currentBatch.length === 0) return;
    
    try {
      // Process all queries in single LLM call
      const results = await this.llm.batchQuery(
        currentBatch.map(b => b.query)
      );
      
      // Resolve each promise
      currentBatch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      // Reject all promises
      currentBatch.forEach(item => {
        item.reject(error);
      });
    }
  }
}
```

---

## Capacity Planning

### Growth Projections

| Period | Users | Queries/Day | Storage | Compute | Cost/Month |
|--------|-------|-------------|---------|---------|------------|
| **Month 1** | 100 | 1,000 | 10 GB | 3 instances | $200 |
| **Month 3** | 500 | 10,000 | 50 GB | 10 instances | $600 |
| **Month 6** | 2,000 | 50,000 | 200 GB | 25 instances | $1,500 |
| **Month 12** | 10,000 | 300,000 | 1 TB | 50 instances | $5,000 |
| **Year 2** | 50,000 | 2,000,000 | 10 TB | 200 instances | $20,000 |

### Scaling Triggers

```typescript
// Automated scaling based on metrics
export const scalingPolicies = {
  scaleUp: {
    cpuUtilization: 70,       // Scale up at 70% CPU
    memoryUtilization: 80,    // Scale up at 80% memory
    requestRate: 1000,        // Scale up at 1000 req/s per pod
    queueDepth: 100,          // Scale up if queue > 100 jobs
    responseTime: 1000        // Scale up if P95 > 1000ms
  },
  
  scaleDown: {
    cpuUtilization: 30,       // Scale down below 30% CPU
    memoryUtilization: 40,    // Scale down below 40% memory
    requestRate: 200,         // Scale down below 200 req/s per pod
    cooldownPeriod: 300       // Wait 5 minutes before scaling down
  }
};
```

---

**Next:** [Monitoring & Analytics](MONITORING_ANALYTICS.md) | [Deployment Guide](DEPLOYMENT_GUIDE.md)
