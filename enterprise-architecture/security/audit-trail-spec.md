# Audit Trail Specification

## Overview

Comprehensive audit logging system for security, compliance, and forensic analysis.

---

## Audit Trail Principles

### 1. Completeness
- All security-relevant events logged
- No gaps in audit trail
- System-generated events included

### 2. Accuracy
- Precise timestamps (UTC)
- Correct event classification
- Validated data integrity

### 3. Tamper-Proof
- Write-once-read-many (WORM) storage
- Cryptographic signatures
- Blockchain-based verification (optional)

### 4. Confidentiality
- Sensitive data masked
- Access control on audit logs
- Encrypted storage

### 5. Availability
- Real-time logging
- High availability storage
- Quick search and retrieval

---

## Audit Event Types

### Authentication Events

```typescript
enum AuthenticationEvent {
  // Successful events
  LOGIN_SUCCESS = 'auth.login.success',
  LOGOUT = 'auth.logout',
  MFA_VERIFIED = 'auth.mfa.verified',
  PASSWORD_CHANGED = 'auth.password.changed',
  
  // Failed events
  LOGIN_FAILED = 'auth.login.failed',
  MFA_FAILED = 'auth.mfa.failed',
  INVALID_TOKEN = 'auth.token.invalid',
  TOKEN_EXPIRED = 'auth.token.expired',
  
  // Security events
  ACCOUNT_LOCKED = 'auth.account.locked',
  PASSWORD_RESET_REQUESTED = 'auth.password.reset.requested',
  PASSWORD_RESET_COMPLETED = 'auth.password.reset.completed',
  SUSPICIOUS_LOGIN_DETECTED = 'auth.suspicious.login'
}
```

### Data Access Events

```typescript
enum DataAccessEvent {
  // Profile events
  PROFILE_VIEWED = 'data.profile.viewed',
  PROFILE_EXPORTED = 'data.profile.exported',
  PROFILE_DOWNLOADED = 'data.profile.downloaded',
  
  // Query events
  QUERY_EXECUTED = 'data.query.executed',
  QUERY_HISTORY_ACCESSED = 'data.query.history.accessed',
  
  // Bulk operations
  BULK_EXPORT = 'data.bulk.export',
  BULK_DELETE = 'data.bulk.delete'
}
```

### Data Modification Events

```typescript
enum DataModificationEvent {
  // Profile changes
  PROFILE_CREATED = 'data.profile.created',
  PROFILE_UPDATED = 'data.profile.updated',
  PROFILE_DELETED = 'data.profile.deleted',
  
  // Settings changes
  SETTINGS_UPDATED = 'data.settings.updated',
  PREFERENCES_CHANGED = 'data.preferences.changed',
  
  // API key management
  API_KEY_CREATED = 'data.api_key.created',
  API_KEY_REVOKED = 'data.api_key.revoked',
  API_KEY_ROTATED = 'data.api_key.rotated'
}
```

### Security Events

```typescript
enum SecurityEvent {
  // Access control
  UNAUTHORIZED_ACCESS_ATTEMPT = 'security.unauthorized.access',
  PERMISSION_DENIED = 'security.permission.denied',
  PRIVILEGE_ESCALATION_ATTEMPT = 'security.privilege.escalation',
  
  // Threats
  BRUTE_FORCE_DETECTED = 'security.brute_force.detected',
  SQL_INJECTION_ATTEMPT = 'security.sql_injection.attempt',
  XSS_ATTEMPT = 'security.xss.attempt',
  RATE_LIMIT_EXCEEDED = 'security.rate_limit.exceeded',
  
  // Network
  IP_BLOCKED = 'security.ip.blocked',
  SUSPICIOUS_IP_DETECTED = 'security.ip.suspicious',
  MULTIPLE_LOCATIONS_DETECTED = 'security.location.multiple',
  
  // System
  ENCRYPTION_KEY_ROTATED = 'security.encryption.key_rotated',
  CERTIFICATE_RENEWED = 'security.certificate.renewed',
  SECURITY_SCAN_COMPLETED = 'security.scan.completed'
}
```

### Administrative Events

```typescript
enum AdministrativeEvent {
  // User management
  USER_CREATED = 'admin.user.created',
  USER_DELETED = 'admin.user.deleted',
  ROLE_ASSIGNED = 'admin.role.assigned',
  PERMISSION_GRANTED = 'admin.permission.granted',
  
  // System configuration
  CONFIG_CHANGED = 'admin.config.changed',
  FEATURE_FLAG_TOGGLED = 'admin.feature.toggled',
  
  // Maintenance
  BACKUP_COMPLETED = 'admin.backup.completed',
  RESTORE_INITIATED = 'admin.restore.initiated',
  DATABASE_MIGRATION = 'admin.database.migration'
}
```

---

## Audit Log Schema

### Standard Audit Log Entry

```typescript
interface AuditLogEntry {
  // Unique identifier
  id: string;
  
  // Event classification
  event: AuditEvent;
  category: 'authentication' | 'data_access' | 'data_modification' | 'security' | 'administrative';
  severity: 'info' | 'warning' | 'error' | 'critical';
  
  // Timestamp
  timestamp: Date;              // UTC timestamp
  timestampMs: number;          // Unix timestamp in milliseconds
  
  // Actor (who performed the action)
  actor: {
    userId: string | null;      // User ID if authenticated
    email: string | null;       // User email
    role: string | null;        // User role
    type: 'user' | 'system' | 'api_client' | 'administrator';
    apiKeyId: string | null;    // If action via API key
  };
  
  // Target (what was affected)
  target: {
    resourceType: string;       // e.g., 'profile', 'api_key', 'settings'
    resourceId: string | null;  // Specific resource ID
    resourceName: string | null;// Human-readable name
  };
  
  // Action details
  action: string;                // Descriptive action
  result: 'success' | 'failure' | 'partial';
  errorCode: string | null;     // Error code if failed
  errorMessage: string | null;  // Error message if failed
  
  // Context
  context: {
    ipAddress: string;          // Client IP
    userAgent: string;          // Browser/client info
    platform: string | null;    // vscode, claude-desktop, web, mobile
    requestId: string;          // Unique request ID
    sessionId: string | null;   // Session ID if applicable
    geolocation: {              // Optional geolocation
      country: string | null;
      city: string | null;
      coordinates: [number, number] | null;
    } | null;
  };
  
  // Changes (for modification events)
  changes: {
    field: string;
    oldValue: any | null;
    newValue: any | null;
  }[] | null;
  
  // Additional metadata
  metadata: Record<string, any>;
  
  // Data integrity
  signature: string | null;     // Cryptographic signature
  previousLogHash: string | null; // Hash of previous log entry (blockchain-style)
}
```

### Example Audit Logs

#### Successful Login

```json
{
  "id": "audit_abc123",
  "event": "auth.login.success",
  "category": "authentication",
  "severity": "info",
  "timestamp": "2025-11-05T10:30:45.123Z",
  "timestampMs": 1730803845123,
  "actor": {
    "userId": "user_xyz789",
    "email": "nashib@example.com",
    "role": "owner",
    "type": "user",
    "apiKeyId": null
  },
  "target": {
    "resourceType": "session",
    "resourceId": "session_def456",
    "resourceName": null
  },
  "action": "User logged in successfully",
  "result": "success",
  "errorCode": null,
  "errorMessage": null,
  "context": {
    "ipAddress": "203.0.113.42",
    "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
    "platform": "web",
    "requestId": "req_ghi789",
    "sessionId": "session_def456",
    "geolocation": {
      "country": "Australia",
      "city": "Sydney",
      "coordinates": [-33.8688, 151.2093]
    }
  },
  "changes": null,
  "metadata": {
    "mfaUsed": true,
    "rememberMe": false
  },
  "signature": "sha256:abc123...",
  "previousLogHash": "sha256:xyz789..."
}
```

#### Profile Update

```json
{
  "id": "audit_def456",
  "event": "data.profile.updated",
  "category": "data_modification",
  "severity": "info",
  "timestamp": "2025-11-05T11:15:30.456Z",
  "timestampMs": 1730806530456,
  "actor": {
    "userId": "user_xyz789",
    "email": "nashib@example.com",
    "role": "owner",
    "type": "user",
    "apiKeyId": null
  },
  "target": {
    "resourceType": "profile",
    "resourceId": "profile_jkl012",
    "resourceName": "Nashib Rana Magar"
  },
  "action": "Profile updated",
  "result": "success",
  "errorCode": null,
  "errorMessage": null,
  "context": {
    "ipAddress": "203.0.113.42",
    "userAgent": "VS Code 1.85.0",
    "platform": "vscode",
    "requestId": "req_mno345",
    "sessionId": "session_def456",
    "geolocation": {
      "country": "Australia",
      "city": "Sydney",
      "coordinates": [-33.8688, 151.2093]
    }
  },
  "changes": [
    {
      "field": "skills[0].proficiency",
      "oldValue": 3,
      "newValue": 4
    },
    {
      "field": "certifications",
      "oldValue": ["AWS SAA", "Oracle Java"],
      "newValue": ["AWS SAA"]
    }
  ],
  "metadata": {
    "fieldsUpdated": ["skills", "certifications"],
    "reEmbeddingRequired": true
  },
  "signature": "sha256:def456...",
  "previousLogHash": "sha256:abc123..."
}
```

#### Unauthorized Access Attempt

```json
{
  "id": "audit_ghi789",
  "event": "security.unauthorized.access",
  "category": "security",
  "severity": "critical",
  "timestamp": "2025-11-05T14:22:10.789Z",
  "timestampMs": 1730817730789,
  "actor": {
    "userId": null,
    "email": null,
    "role": null,
    "type": "user",
    "apiKeyId": null
  },
  "target": {
    "resourceType": "profile",
    "resourceId": "profile_jkl012",
    "resourceName": "Nashib Rana Magar"
  },
  "action": "Attempted to access profile without permission",
  "result": "failure",
  "errorCode": "UNAUTHORIZED",
  "errorMessage": "Authentication required",
  "context": {
    "ipAddress": "198.51.100.23",
    "userAgent": "curl/7.68.0",
    "platform": null,
    "requestId": "req_pqr678",
    "sessionId": null,
    "geolocation": {
      "country": "Unknown",
      "city": null,
      "coordinates": null
    }
  },
  "changes": null,
  "metadata": {
    "attemptCount": 5,
    "withinTimeWindow": "5 minutes",
    "actionTaken": "IP temporarily blocked"
  },
  "signature": "sha256:ghi789...",
  "previousLogHash": "sha256:def456..."
}
```

---

## Audit Log Storage

### Storage Architecture

```typescript
// Multi-tier storage for audit logs
export class AuditLogStorage {
  // Tier 1: Real-time stream (Kafka)
  private kafka: KafkaProducer;
  
  // Tier 2: Hot storage (Elasticsearch) - last 90 days
  private elasticsearch: ElasticsearchClient;
  
  // Tier 3: Warm storage (PostgreSQL) - 90 days to 1 year
  private postgresql: PostgresDatabase;
  
  // Tier 4: Cold storage (S3 Glacier) - long-term archive
  private s3: S3Client;
  
  async writeLog(log: AuditLogEntry): Promise<void> {
    // Add cryptographic signature
    log.signature = await this.signLog(log);
    
    // Add blockchain-style hash chain
    const previousLog = await this.getLatestLog();
    log.previousLogHash = previousLog ? await this.hashLog(previousLog) : null;
    
    // Write to all tiers in parallel
    await Promise.all([
      this.kafka.send('audit-logs', log),           // Real-time stream
      this.elasticsearch.index('audit-logs', log),  // Hot storage
      this.postgresql.insert('audit_logs', log)     // Warm storage
    ]);
  }
  
  // Cryptographic signature for tamper detection
  private async signLog(log: AuditLogEntry): Promise<string> {
    const data = JSON.stringify({
      event: log.event,
      timestamp: log.timestamp,
      actor: log.actor,
      target: log.target,
      action: log.action,
      result: log.result
    });
    
    return crypto
      .createHmac('sha256', process.env.AUDIT_LOG_SECRET!)
      .update(data)
      .digest('hex');
  }
  
  // Hash for blockchain-style verification
  private async hashLog(log: AuditLogEntry): Promise<string> {
    const data = JSON.stringify(log);
    return crypto
      .createHash('sha256')
      .update(data)
      .digest('hex');
  }
  
  // Verify log integrity
  async verifyLogIntegrity(logId: string): Promise<boolean> {
    const log = await this.getLog(logId);
    const expectedSignature = await this.signLog(log);
    
    return log.signature === expectedSignature;
  }
  
  // Verify hash chain
  async verifyHashChain(startId: string, endId: string): Promise<boolean> {
    const logs = await this.getLogRange(startId, endId);
    
    for (let i = 1; i < logs.length; i++) {
      const currentLog = logs[i];
      const previousLog = logs[i - 1];
      const expectedHash = await this.hashLog(previousLog);
      
      if (currentLog.previousLogHash !== expectedHash) {
        return false;  // Chain broken - tampering detected
      }
    }
    
    return true;
  }
}
```

### Retention Policy

```yaml
audit_log_retention:
  # Real-time stream
  kafka:
    retention: 7_days
    purpose: Real-time monitoring and alerting
    
  # Hot storage (searchable)
  elasticsearch:
    retention: 90_days
    purpose: Recent log analysis and investigation
    
  # Warm storage
  postgresql:
    retention: 1_year
    purpose: Compliance and historical analysis
    
  # Cold storage (archived)
  s3_glacier:
    retention: 7_years
    purpose: Long-term compliance (GDPR, SOC 2)
    
# Automatic archival job
archival_schedule:
  frequency: daily
  time: "02:00 UTC"
  actions:
    - Move 90-day-old logs from Elasticsearch to PostgreSQL
    - Move 1-year-old logs from PostgreSQL to S3 Glacier
    - Verify data integrity during migration
```

---

## Audit Log Queries

### Common Query Patterns

```typescript
export class AuditLogQuery {
  // Find all events by user
  async getUserActivity(userId: string, from: Date, to: Date): Promise<AuditLogEntry[]> {
    return await this.elasticsearch.search({
      index: 'audit-logs',
      body: {
        query: {
          bool: {
            must: [
              { term: { 'actor.userId': userId } },
              { range: { timestamp: { gte: from, lte: to } } }
            ]
          }
        },
        sort: [{ timestamp: 'desc' }]
      }
    });
  }
  
  // Find failed login attempts
  async getFailedLogins(minutes: number = 30): Promise<AuditLogEntry[]> {
    const since = new Date(Date.now() - minutes * 60 * 1000);
    
    return await this.elasticsearch.search({
      index: 'audit-logs',
      body: {
        query: {
          bool: {
            must: [
              { term: { event: 'auth.login.failed' } },
              { range: { timestamp: { gte: since } } }
            ]
          }
        }
      }
    });
  }
  
  // Find security events
  async getSecurityEvents(severity: string = 'critical'): Promise<AuditLogEntry[]> {
    return await this.elasticsearch.search({
      index: 'audit-logs',
      body: {
        query: {
          bool: {
            must: [
              { term: { category: 'security' } },
              { term: { severity } }
            ]
          }
        },
        sort: [{ timestamp: 'desc' }]
      }
    });
  }
  
  // Find data modifications
  async getDataChanges(resourceId: string): Promise<AuditLogEntry[]> {
    return await this.elasticsearch.search({
      index: 'audit-logs',
      body: {
        query: {
          bool: {
            must: [
              { term: { category: 'data_modification' } },
              { term: { 'target.resourceId': resourceId } }
            ]
          }
        },
        sort: [{ timestamp: 'asc' }]
      }
    });
  }
  
  // Aggregate events by type
  async getEventStatistics(from: Date, to: Date): Promise<EventStatistics> {
    const result = await this.elasticsearch.search({
      index: 'audit-logs',
      body: {
        query: {
          range: { timestamp: { gte: from, lte: to } }
        },
        aggs: {
          by_category: {
            terms: { field: 'category' }
          },
          by_severity: {
            terms: { field: 'severity' }
          },
          by_result: {
            terms: { field: 'result' }
          }
        }
      }
    });
    
    return this.parseAggregations(result.aggregations);
  }
}
```

---

## Audit Log Monitoring & Alerting

### Real-Time Alerts

```typescript
// Kafka consumer for real-time audit log monitoring
export class AuditLogMonitor {
  private kafka: KafkaConsumer;
  
  async startMonitoring(): Promise<void> {
    this.kafka.subscribe(['audit-logs']);
    
    this.kafka.on('message', async (message) => {
      const log: AuditLogEntry = JSON.parse(message.value);
      
      // Check for security alerts
      await this.checkSecurityAlerts(log);
      
      // Check for compliance violations
      await this.checkComplianceViolations(log);
      
      // Update metrics
      await this.updateMetrics(log);
    });
  }
  
  private async checkSecurityAlerts(log: AuditLogEntry): Promise<void> {
    // Multiple failed logins
    if (log.event === 'auth.login.failed') {
      const count = await this.countRecentEvents('auth.login.failed', log.actor.userId, 5);
      if (count >= 5) {
        await this.sendAlert({
          type: 'brute_force_attempt',
          severity: 'critical',
          userId: log.actor.userId,
          message: `${count} failed login attempts in 5 minutes`
        });
      }
    }
    
    // Unauthorized access
    if (log.event === 'security.unauthorized.access') {
      await this.sendAlert({
        type: 'unauthorized_access',
        severity: 'high',
        ipAddress: log.context.ipAddress,
        message: log.errorMessage
      });
    }
    
    // Privilege escalation
    if (log.event === 'security.privilege.escalation') {
      await this.sendAlert({
        type: 'privilege_escalation',
        severity: 'critical',
        userId: log.actor.userId,
        message: 'Privilege escalation attempt detected'
      });
    }
  }
  
  private async checkComplianceViolations(log: AuditLogEntry): Promise<void> {
    // Data export without proper authorization
    if (log.event === 'data.profile.exported' && log.actor.role !== 'owner') {
      await this.sendAlert({
        type: 'compliance_violation',
        severity: 'high',
        message: 'Profile exported by non-owner'
      });
    }
    
    // Bulk operations
    if (log.event.startsWith('data.bulk.')) {
      await this.sendAlert({
        type: 'bulk_operation',
        severity: 'medium',
        message: `Bulk operation: ${log.action}`
      });
    }
  }
}
```

---

## Audit Log Reporting

### Compliance Reports

```typescript
export class AuditLogReporting {
  // Generate GDPR compliance report
  async generateGDPRReport(userId: string, from: Date, to: Date): Promise<GDPRReport> {
    const logs = await this.getUserActivity(userId, from, to);
    
    return {
      userId,
      period: { start: from, end: to },
      
      dataAccess: {
        profileViews: this.filterByEvent(logs, 'data.profile.viewed').length,
        exports: this.filterByEvent(logs, 'data.profile.exported').length,
        queries: this.filterByEvent(logs, 'data.query.executed').length
      },
      
      dataModifications: {
        updates: this.filterByEvent(logs, 'data.profile.updated').length,
        deletions: this.filterByEvent(logs, 'data.profile.deleted').length
      },
      
      consentChanges: {
        granted: this.filterByEvent(logs, 'consent.granted').length,
        withdrawn: this.filterByEvent(logs, 'consent.withdrawn').length
      },
      
      dataSubjectRequests: {
        accessRequests: this.filterByEvent(logs, 'dsr.access.requested').length,
        deletionRequests: this.filterByEvent(logs, 'dsr.deletion.requested').length,
        rectificationRequests: this.filterByEvent(logs, 'dsr.rectification.requested').length
      },
      
      securityEvents: {
        loginAttempts: this.filterByEvent(logs, 'auth.login.failed').length,
        unauthorizedAccess: this.filterByCategory(logs, 'security').length
      }
    };
  }
  
  // Generate SOC 2 audit trail
  async generateSOC2AuditTrail(from: Date, to: Date): Promise<SOC2AuditTrail> {
    const logs = await this.getAllLogs(from, to);
    
    return {
      period: { start: from, end: to },
      
      // Security controls
      security: {
        accessControlEvents: this.filterByCategory(logs, 'authentication').length,
        encryptionEvents: this.filterByEvent(logs, 'security.encryption.*').length,
        incidentResponses: this.filterByEvent(logs, 'security.*').length
      },
      
      // Availability controls
      availability: {
        systemUptime: await this.calculateUptime(from, to),
        backupEvents: this.filterByEvent(logs, 'admin.backup.completed').length
      },
      
      // Processing integrity
      processingIntegrity: {
        dataValidationErrors: this.filterByEvent(logs, 'validation.failed').length,
        errorRate: this.calculateErrorRate(logs)
      },
      
      // Confidentiality
      confidentiality: {
        dataAccessEvents: this.filterByCategory(logs, 'data_access').length,
        unauthorizedAccessAttempts: this.filterByEvent(logs, 'security.unauthorized.access').length
      },
      
      // Privacy
      privacy: {
        consentManagementEvents: this.filterByEvent(logs, 'consent.*').length,
        dataSubjectRequests: this.filterByEvent(logs, 'dsr.*').length
      }
    };
  }
}
```

---

**Status:** Comprehensive Audit Trail System Complete ✅

**Capabilities:**
- ✅ Comprehensive event logging
- ✅ Tamper-proof storage
- ✅ Real-time monitoring
- ✅ Compliance reporting
- ✅ Forensic analysis
- ✅ Blockchain-style integrity verification
