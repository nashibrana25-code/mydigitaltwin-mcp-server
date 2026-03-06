# Monitoring & Analytics - Digital Twin MCP Server

## Overview

Comprehensive monitoring and analytics system for production-grade observability, performance tracking, and business insights.

---

## Observability Pillars

### 1. **Metrics** - What is happening?
- System performance metrics
- Business metrics
- Custom application metrics

### 2. **Logs** - Why is it happening?
- Structured logging
- Centralized log aggregation
- Log analysis and search

### 3. **Traces** - Where is it happening?
- Distributed tracing
- Request flow visualization
- Performance bottleneck identification

---

## Metrics Collection

### System Metrics

```typescript
// Prometheus metrics collection
import client from 'prom-client';

// Create metrics registry
export const register = new client.Registry();

// Default system metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({ register });

// Custom application metrics
export const metrics = {
  // HTTP request duration histogram
  httpRequestDuration: new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
  }),
  
  // HTTP request counter
  httpRequestTotal: new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code']
  }),
  
  // Active connections gauge
  activeConnections: new client.Gauge({
    name: 'active_connections',
    help: 'Number of active connections'
  }),
  
  // Vector query latency
  vectorQueryDuration: new client.Histogram({
    name: 'vector_query_duration_seconds',
    help: 'Duration of vector database queries',
    buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5]
  }),
  
  // LLM generation latency
  llmGenerationDuration: new client.Histogram({
    name: 'llm_generation_duration_seconds',
    help: 'Duration of LLM response generation',
    buckets: [0.5, 1, 2, 3, 5, 10, 15, 20]
  }),
  
  // Cache hit rate
  cacheHits: new client.Counter({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['layer'] // L1, L2
  }),
  
  cacheMisses: new client.Counter({
    name: 'cache_misses_total',
    help: 'Total number of cache misses'
  }),
  
  // Business metrics
  queriesExecuted: new client.Counter({
    name: 'queries_executed_total',
    help: 'Total number of profile queries executed',
    labelNames: ['platform', 'user_tier']
  }),
  
  profileUpdates: new client.Counter({
    name: 'profile_updates_total',
    help: 'Total number of profile updates'
  }),
  
  apiKeyCreated: new client.Counter({
    name: 'api_keys_created_total',
    help: 'Total number of API keys created'
  }),
  
  // Error tracking
  errors: new client.Counter({
    name: 'errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'severity']
  })
};

// Register all metrics
Object.values(metrics).forEach(metric => register.registerMetric(metric));

// Expose metrics endpoint
export function metricsEndpoint(req: Request, res: Response): void {
  res.set('Content-Type', register.contentType);
  res.end(register.metrics());
}
```

### Metrics Middleware

```typescript
// Express middleware for automatic metrics collection
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  // Track active connections
  metrics.activeConnections.inc();
  
  // On response finish
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path;
    
    // Record request duration
    metrics.httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
    
    // Count requests
    metrics.httpRequestTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
    
    // Decrement active connections
    metrics.activeConnections.dec();
    
    // Track errors
    if (res.statusCode >= 400) {
      const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
      metrics.errors.labels(errorType, 'medium').inc();
    }
  });
  
  next();
}
```

---

## Structured Logging

### Log Configuration

```typescript
// Winston logger configuration
import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

// Log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

winston.addColors(colors);

// Format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Format for JSON logs (production)
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: jsonFormat,
  defaultMeta: {
    service: 'digital-twin-mcp',
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION
  },
  transports: [
    // Console transport (development)
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'development' ? consoleFormat : jsonFormat
    }),
    
    // File transport (all logs)
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10
    }),
    
    // File transport (errors only)
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760,
      maxFiles: 10
    }),
    
    // Elasticsearch transport (production)
    ...(process.env.NODE_ENV === 'production' ? [
      new ElasticsearchTransport({
        level: 'info',
        clientOpts: {
          node: process.env.ELASTICSEARCH_URL,
          auth: {
            username: process.env.ELASTICSEARCH_USER!,
            password: process.env.ELASTICSEARCH_PASSWORD!
          }
        },
        index: 'digitaltwin-logs'
      })
    ] : [])
  ]
});

// Logging helpers
export const log = {
  error: (message: string, meta?: any) => logger.error(message, meta),
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  info: (message: string, meta?: any) => logger.info(message, meta),
  http: (message: string, meta?: any) => logger.http(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta)
};
```

### Request Logging Middleware

```typescript
// HTTP request logging
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const requestId = req.headers['x-request-id'] || generateId();
  
  // Attach request ID to request object
  req.requestId = requestId;
  
  // Log request
  logger.http('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id
  });
  
  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.http('Request completed', {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('content-length')
    });
  });
  
  next();
}
```

---

## Distributed Tracing

### OpenTelemetry Integration

```typescript
// OpenTelemetry setup
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';

// Create tracer provider
const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'digital-twin-mcp',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION,
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV
  })
});

// Configure Jaeger exporter
const jaegerExporter = new JaegerExporter({
  endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  tags: {
    environment: process.env.NODE_ENV
  }
});

// Add span processor
provider.addSpanProcessor(new BatchSpanProcessor(jaegerExporter));

// Register the provider
provider.register();

// Auto-instrument HTTP and Express
registerInstrumentations({
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation()
  ]
});

// Get tracer
export const tracer = provider.getTracer('digital-twin-mcp');
```

### Custom Tracing

```typescript
// Custom span creation
export async function queryWithTracing(
  question: string,
  userId: string
): Promise<QueryResult> {
  // Create span for the entire query operation
  return await tracer.startActiveSpan('digital-twin-query', async (span) => {
    try {
      span.setAttribute('user.id', userId);
      span.setAttribute('query.question', question);
      
      // Vector search span
      const vectorResults = await tracer.startActiveSpan('vector-search', async (vectorSpan) => {
        try {
          const results = await vectorDB.query(question, 3);
          vectorSpan.setAttribute('results.count', results.length);
          return results;
        } finally {
          vectorSpan.end();
        }
      });
      
      // LLM generation span
      const response = await tracer.startActiveSpan('llm-generation', async (llmSpan) => {
        try {
          const llmResponse = await groq.generateResponse(question, vectorResults);
          llmSpan.setAttribute('response.length', llmResponse.length);
          return llmResponse;
        } finally {
          llmSpan.end();
        }
      });
      
      span.setStatus({ code: SpanStatusCode.OK });
      return { question, response, context: vectorResults };
      
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message
      });
      throw error;
    } finally {
      span.end();
    }
  });
}
```

---

## Error Tracking

### Sentry Integration

```typescript
// Sentry error tracking
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  release: process.env.APP_VERSION,
  
  // Performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions
  profilesSampleRate: 0.1,
  
  integrations: [
    new ProfilingIntegration()
  ],
  
  // Filter sensitive data
  beforeSend(event, hint) {
    // Remove sensitive information
    if (event.request?.headers) {
      delete event.request.headers.authorization;
      delete event.request.headers.cookie;
    }
    return event;
  }
});

// Error capture middleware
export function errorTrackingMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Capture error in Sentry
  Sentry.captureException(error, {
    user: {
      id: req.user?.id,
      email: req.user?.email
    },
    tags: {
      path: req.path,
      method: req.method
    },
    extra: {
      requestId: req.requestId,
      body: req.body,
      query: req.query
    }
  });
  
  // Log error
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    requestId: req.requestId
  });
  
  // Send error response
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.requestId
  });
}
```

---

## Health Checks

### Health Check Endpoints

```typescript
// Health check endpoints
export class HealthCheckService {
  async checkOverallHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkVectorDB(),
      this.checkRedis(),
      this.checkLLMService()
    ]);
    
    const allHealthy = checks.every(c => c.status === 'fulfilled' && c.value.healthy);
    
    return {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: checks[0].status === 'fulfilled' ? checks[0].value : { healthy: false },
        vectorDB: checks[1].status === 'fulfilled' ? checks[1].value : { healthy: false },
        redis: checks[2].status === 'fulfilled' ? checks[2].value : { healthy: false },
        llm: checks[3].status === 'fulfilled' ? checks[3].value : { healthy: false }
      }
    };
  }
  
  private async checkDatabase(): Promise<ComponentHealth> {
    try {
      const start = Date.now();
      await db.query('SELECT 1');
      const latency = Date.now() - start;
      
      return {
        healthy: true,
        latency,
        status: latency < 100 ? 'optimal' : 'degraded'
      };
    } catch (error) {
      return {
        healthy: false,
        error: (error as Error).message
      };
    }
  }
  
  private async checkVectorDB(): Promise<ComponentHealth> {
    try {
      const start = Date.now();
      await vectorDB.info();
      const latency = Date.now() - start;
      
      return {
        healthy: true,
        latency,
        status: latency < 200 ? 'optimal' : 'degraded'
      };
    } catch (error) {
      return {
        healthy: false,
        error: (error as Error).message
      };
    }
  }
  
  private async checkRedis(): Promise<ComponentHealth> {
    try {
      const start = Date.now();
      await redis.ping();
      const latency = Date.now() - start;
      
      return {
        healthy: true,
        latency,
        status: latency < 50 ? 'optimal' : 'degraded'
      };
    } catch (error) {
      return {
        healthy: false,
        error: (error as Error).message
      };
    }
  }
  
  private async checkLLMService(): Promise<ComponentHealth> {
    try {
      // Simple health check - don't make expensive API call
      return {
        healthy: !!process.env.GROQ_API_KEY,
        status: 'optimal'
      };
    } catch (error) {
      return {
        healthy: false,
        error: (error as Error).message
      };
    }
  }
}

// Health check routes
app.get('/health', async (req, res) => {
  const health = await healthCheckService.checkOverallHealth();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

app.get('/health/liveness', (req, res) => {
  // Simple liveness probe - is the app running?
  res.status(200).json({ alive: true });
});

app.get('/health/readiness', async (req, res) => {
  // Readiness probe - is the app ready to serve traffic?
  const health = await healthCheckService.checkOverallHealth();
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});
```

---

## Analytics & Business Metrics

### Usage Analytics

```typescript
// Analytics tracking
export class AnalyticsService {
  private segment: Analytics;
  
  constructor() {
    this.segment = new Analytics({
      writeKey: process.env.SEGMENT_WRITE_KEY!
    });
  }
  
  // Track query execution
  async trackQuery(data: {
    userId: string;
    question: string;
    resultsCount: number;
    latency: number;
    platform: string;
  }): Promise<void> {
    await this.segment.track({
      userId: data.userId,
      event: 'Query Executed',
      properties: {
        question_length: data.question.length,
        results_count: data.resultsCount,
        latency_ms: data.latency,
        platform: data.platform
      },
      timestamp: new Date()
    });
    
    // Also log to data warehouse for long-term analysis
    await this.logToDataWarehouse('query_executed', data);
  }
  
  // Track profile updates
  async trackProfileUpdate(data: {
    userId: string;
    fieldsUpdated: string[];
    updateSource: string;
  }): Promise<void> {
    await this.segment.track({
      userId: data.userId,
      event: 'Profile Updated',
      properties: {
        fields_updated: data.fieldsUpdated,
        fields_count: data.fieldsUpdated.length,
        update_source: data.updateSource
      }
    });
  }
  
  // Track user engagement
  async trackEngagement(userId: string, action: string): Promise<void> {
    await this.segment.track({
      userId,
      event: 'User Engagement',
      properties: {
        action,
        timestamp: new Date()
      }
    });
  }
  
  private async logToDataWarehouse(event: string, data: any): Promise<void> {
    // Send to BigQuery, Snowflake, or similar
    await bigquery.dataset('analytics').table('events').insert({
      event,
      data,
      timestamp: new Date().toISOString()
    });
  }
}
```

### Query Analytics Dashboard

```typescript
// Query analytics aggregation
export class QueryAnalytics {
  // Get query statistics for date range
  async getQueryStats(
    startDate: Date,
    endDate: Date
  ): Promise<QueryStats> {
    const queries = await db.queries.find({
      timestamp: { $gte: startDate, $lte: endDate }
    });
    
    return {
      totalQueries: queries.length,
      uniqueUsers: new Set(queries.map(q => q.userId)).size,
      averageLatency: this.calculateAverage(queries.map(q => q.latency)),
      p95Latency: this.calculatePercentile(queries.map(q => q.latency), 95),
      p99Latency: this.calculatePercentile(queries.map(q => q.latency), 99),
      
      // Platform breakdown
      byPlatform: this.groupBy(queries, 'platform'),
      
      // Top queries
      topQueries: this.getTopQueries(queries, 10),
      
      // User tier breakdown
      byUserTier: this.groupBy(queries, 'userTier'),
      
      // Hourly distribution
      byHour: this.groupByHour(queries),
      
      // Success rate
      successRate: this.calculateSuccessRate(queries)
    };
  }
  
  // Get most popular query topics
  async getPopularTopics(): Promise<TopicAnalysis[]> {
    const queries = await db.queries.find({
      timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });
    
    // Analyze query topics using NLP
    const topics = await this.analyzeTopics(queries.map(q => q.question));
    
    return topics;
  }
}
```

---

## Alerting Rules

### Alert Configuration

```yaml
# Prometheus alerting rules
groups:
  - name: digital_twin_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(errors_total[5m]) > 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }} errors/sec"
      
      # High latency
      - alert: HighQueryLatency
        expr: histogram_quantile(0.95, rate(vector_query_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High query latency"
          description: "P95 query latency is {{ $value }}s"
      
      # Low cache hit rate
      - alert: LowCacheHitRate
        expr: rate(cache_hits_total[10m]) / (rate(cache_hits_total[10m]) + rate(cache_misses_total[10m])) < 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Low cache hit rate"
          description: "Cache hit rate is {{ $value | humanizePercentage }}"
      
      # High memory usage
      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value | humanizePercentage }}"
      
      # Database connection pool exhaustion
      - alert: DatabasePoolExhaustion
        expr: database_pool_connections_active / database_pool_connections_max > 0.9
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Database connection pool near exhaustion"
          description: "{{ $value | humanizePercentage }} of connections in use"
```

### Alert Notification System

```typescript
// Alert notification service
export class AlertNotificationService {
  async sendAlert(alert: Alert): Promise<void> {
    // Send to multiple channels based on severity
    const promises = [];
    
    // Always log
    logger.error('Alert triggered', alert);
    
    // Critical alerts
    if (alert.severity === 'critical') {
      promises.push(this.sendPagerDuty(alert));
      promises.push(this.sendSlack(alert, '#alerts-critical'));
      promises.push(this.sendEmail(alert, 'oncall@digitaltwin.com'));
    }
    
    // Warning alerts
    if (alert.severity === 'warning') {
      promises.push(this.sendSlack(alert, '#alerts-warning'));
    }
    
    await Promise.all(promises);
  }
  
  private async sendPagerDuty(alert: Alert): Promise<void> {
    await pagerduty.trigger({
      incident_key: alert.name,
      description: alert.summary,
      details: alert
    });
  }
  
  private async sendSlack(alert: Alert, channel: string): Promise<void> {
    await slack.chat.postMessage({
      channel,
      text: `🚨 *${alert.name}*`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `🚨 ${alert.name}`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: alert.summary
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Severity:*\n${alert.severity}`
            },
            {
              type: 'mrkdwn',
              text: `*Time:*\n${alert.timestamp}`
            }
          ]
        }
      ]
    });
  }
  
  private async sendEmail(alert: Alert, to: string): Promise<void> {
    await emailService.send({
      to,
      subject: `[${alert.severity.toUpperCase()}] ${alert.name}`,
      html: this.renderAlertEmail(alert)
    });
  }
}
```

---

## Dashboards

### Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "title": "Digital Twin MCP Server - Production Metrics",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Response Time (P95)",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(errors_total[5m])"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Cache Hit Rate",
        "targets": [
          {
            "expr": "rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))"
          }
        ],
        "type": "stat"
      },
      {
        "title": "Active Pods",
        "targets": [
          {
            "expr": "count(up{job=\"mcp-server\"})"
          }
        ],
        "type": "stat"
      },
      {
        "title": "CPU Usage",
        "targets": [
          {
            "expr": "rate(process_cpu_seconds_total[5m]) * 100"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Memory Usage",
        "targets": [
          {
            "expr": "process_resident_memory_bytes"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Query Latency Distribution",
        "targets": [
          {
            "expr": "rate(vector_query_duration_seconds_bucket[5m])"
          }
        ],
        "type": "heatmap"
      }
    ]
  }
}
```

---

## SLO & SLI Definitions

### Service Level Objectives

```yaml
slos:
  availability:
    target: 99.9%  # 43 minutes downtime per month
    measurement_window: 30d
    
  request_latency:
    p95: 1500ms
    p99: 3000ms
    measurement_window: 24h
    
  error_budget:
    monthly: 0.1%  # 99.9% success rate
    
  cache_performance:
    hit_rate: 80%
    measurement_window: 24h

# Service Level Indicators
slis:
  - name: availability
    query: "sum(rate(http_requests_total{status_code!~'5..'}[5m])) / sum(rate(http_requests_total[5m]))"
    
  - name: latency_p95
    query: "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))"
    
  - name: error_rate
    query: "sum(rate(http_requests_total{status_code=~'5..'}[5m])) / sum(rate(http_requests_total[5m]))"
    
  - name: cache_hit_rate
    query: "rate(cache_hits_total[10m]) / (rate(cache_hits_total[10m]) + rate(cache_misses_total[10m]))"
```

---

## Incident Response

### On-Call Runbook

```markdown
# Incident Response Runbook

## Severity Levels

### P1 - Critical
- Service completely down
- Data loss occurring
- Security breach
- Response Time: 15 minutes
- Escalation: Immediate page to on-call

### P2 - High
- Degraded performance
- Partial service outage
- High error rates
- Response Time: 30 minutes
- Escalation: Slack alert, page if unresolved in 30m

### P3 - Medium
- Minor performance issues
- Non-critical errors
- Response Time: 2 hours
- Escalation: Slack alert

## Common Issues

### High Latency
1. Check Grafana dashboard for bottleneck
2. Review distributed traces in Jaeger
3. Check database slow query log
4. Verify cache hit rate
5. Scale up pods if CPU/memory high

### High Error Rate
1. Check error logs in Elasticsearch
2. Review Sentry for error patterns
3. Check health of dependencies (DB, Redis, Vector DB)
4. Verify API keys and credentials
5. Check for recent deployments

### Database Issues
1. Check connection pool utilization
2. Review slow query log
3. Check replication lag
4. Verify backup status
5. Scale read replicas if needed

### Cache Issues
1. Check Redis cluster health
2. Verify cache hit rate
3. Review cache eviction rate
4. Check memory usage
5. Restart Redis nodes if needed
```

---

**Next:** [Deployment Guide](DEPLOYMENT_GUIDE.md)
