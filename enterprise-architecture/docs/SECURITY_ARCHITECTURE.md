# Security Architecture - Digital Twin MCP Server

## Security Principles

### 1. **Zero Trust Architecture**
- Never trust, always verify
- Assume breach mentality
- Least privilege access
- Continuous verification

### 2. **Defense in Depth**
- Multiple security layers
- Fail-safe defaults
- Separation of duties
- Security at every layer

### 3. **Privacy by Design**
- Data minimization
- Purpose limitation
- Transparency
- User control

---

## Authentication & Authorization

### Authentication Methods

#### 1. **OAuth 2.0 / OpenID Connect (Web/Mobile)**

```typescript
// OAuth 2.0 implementation
import { OAuth2Client } from 'google-auth-library';

interface AuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export class OAuth2Service {
  private client: OAuth2Client;
  
  constructor(config: AuthConfig) {
    this.client = new OAuth2Client(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );
  }
  
  // Generate authorization URL
  getAuthUrl(): string {
    return this.client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'openid',
        'profile',
        'email',
        'https://api.digitaltwin.com/scope/query',
        'https://api.digitaltwin.com/scope/update'
      ],
      prompt: 'consent'
    });
  }
  
  // Exchange code for tokens
  async exchangeCodeForTokens(code: string): Promise<TokenSet> {
    const { tokens } = await this.client.getToken(code);
    
    // Validate ID token
    const ticket = await this.client.verifyIdToken({
      idToken: tokens.id_token!,
      audience: process.env.OAUTH_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    
    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token,
      idToken: tokens.id_token!,
      expiresAt: tokens.expiry_date!,
      user: {
        id: payload!.sub!,
        email: payload!.email!,
        name: payload!.name,
        picture: payload!.picture
      }
    };
  }
  
  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<string> {
    this.client.setCredentials({ refresh_token: refreshToken });
    const { credentials } = await this.client.refreshAccessToken();
    return credentials.access_token!;
  }
}
```

#### 2. **JWT Tokens (API Authentication)**

```typescript
// JWT token service
import jwt from 'jsonwebtoken';

interface JWTPayload {
  userId: string;
  email: string;
  scopes: string[];
  platform: 'vscode' | 'claude-desktop' | 'web' | 'mobile' | 'api';
}

export class JWTService {
  private readonly secret: string;
  private readonly issuer: string = 'https://digitaltwin.com';
  
  constructor() {
    this.secret = process.env.JWT_SECRET!;
    if (!this.secret) {
      throw new Error('JWT_SECRET environment variable not set');
    }
  }
  
  // Generate JWT
  generateToken(payload: JWTPayload, expiresIn: string = '1h'): string {
    return jwt.sign(payload, this.secret, {
      issuer: this.issuer,
      audience: 'https://api.digitaltwin.com',
      expiresIn,
      algorithm: 'HS256'
    });
  }
  
  // Verify and decode JWT
  verifyToken(token: string): JWTPayload {
    try {
      const decoded = jwt.verify(token, this.secret, {
        issuer: this.issuer,
        audience: 'https://api.digitaltwin.com'
      }) as JWTPayload;
      
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError('Token expired', 401);
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError('Invalid token', 401);
      }
      throw error;
    }
  }
  
  // Generate API key (long-lived JWT)
  generateApiKey(userId: string, name: string): string {
    return jwt.sign(
      {
        userId,
        type: 'api_key',
        name,
        scopes: ['query', 'search'],
        platform: 'api'
      },
      this.secret,
      {
        issuer: this.issuer,
        expiresIn: '365d', // 1 year
        jwtid: generateSecureId()
      }
    );
  }
}
```

#### 3. **API Keys (VS Code / Claude Desktop)**

```typescript
// API Key management
export class ApiKeyManager {
  private db: Database;
  
  // Create new API key
  async createApiKey(userId: string, name: string, scopes: string[]): Promise<ApiKey> {
    const key = this.generateSecureKey();
    const hashedKey = await this.hashKey(key);
    
    const apiKey = {
      id: generateId(),
      userId,
      name,
      keyPrefix: key.substring(0, 8),
      hashedKey,
      scopes,
      createdAt: new Date(),
      lastUsedAt: null,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    };
    
    await this.db.apiKeys.insert(apiKey);
    
    // Return key only once (never stored in plaintext)
    return {
      ...apiKey,
      key // Only returned on creation
    };
  }
  
  // Validate API key
  async validateApiKey(key: string): Promise<ApiKeyData | null> {
    const hashedKey = await this.hashKey(key);
    const apiKey = await this.db.apiKeys.findOne({ hashedKey });
    
    if (!apiKey) {
      return null;
    }
    
    // Check expiration
    if (apiKey.expiresAt < new Date()) {
      throw new AuthError('API key expired', 401);
    }
    
    // Update last used timestamp
    await this.db.apiKeys.update(
      { id: apiKey.id },
      { lastUsedAt: new Date() }
    );
    
    return apiKey;
  }
  
  // Revoke API key
  async revokeApiKey(keyId: string, userId: string): Promise<void> {
    await this.db.apiKeys.delete({ id: keyId, userId });
    
    // Audit log
    await this.logAudit({
      action: 'api_key_revoked',
      keyId,
      userId,
      timestamp: new Date()
    });
  }
  
  // Generate cryptographically secure key
  private generateSecureKey(): string {
    return `dtwin_${crypto.randomBytes(32).toString('hex')}`;
  }
  
  // Hash key for storage (bcrypt)
  private async hashKey(key: string): Promise<string> {
    return await bcrypt.hash(key, 12);
  }
}
```

---

### Role-Based Access Control (RBAC)

```typescript
// RBAC implementation
enum Role {
  OWNER = 'owner',           // Full control
  ADMIN = 'admin',           // Can manage settings
  EDITOR = 'editor',         // Can update profile
  VIEWER = 'viewer',         // Read-only access
  API_CLIENT = 'api_client'  // Programmatic access
}

enum Permission {
  // Profile permissions
  PROFILE_READ = 'profile:read',
  PROFILE_UPDATE = 'profile:update',
  PROFILE_DELETE = 'profile:delete',
  
  // Query permissions
  QUERY_EXECUTE = 'query:execute',
  QUERY_HISTORY = 'query:history',
  
  // Settings permissions
  SETTINGS_READ = 'settings:read',
  SETTINGS_UPDATE = 'settings:update',
  
  // API key permissions
  API_KEY_CREATE = 'api_key:create',
  API_KEY_REVOKE = 'api_key:revoke',
  API_KEY_LIST = 'api_key:list',
  
  // Audit permissions
  AUDIT_READ = 'audit:read'
}

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.OWNER]: [
    Permission.PROFILE_READ,
    Permission.PROFILE_UPDATE,
    Permission.PROFILE_DELETE,
    Permission.QUERY_EXECUTE,
    Permission.QUERY_HISTORY,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_UPDATE,
    Permission.API_KEY_CREATE,
    Permission.API_KEY_REVOKE,
    Permission.API_KEY_LIST,
    Permission.AUDIT_READ
  ],
  [Role.ADMIN]: [
    Permission.PROFILE_READ,
    Permission.PROFILE_UPDATE,
    Permission.QUERY_EXECUTE,
    Permission.QUERY_HISTORY,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_UPDATE,
    Permission.API_KEY_LIST,
    Permission.AUDIT_READ
  ],
  [Role.EDITOR]: [
    Permission.PROFILE_READ,
    Permission.PROFILE_UPDATE,
    Permission.QUERY_EXECUTE
  ],
  [Role.VIEWER]: [
    Permission.PROFILE_READ,
    Permission.QUERY_EXECUTE
  ],
  [Role.API_CLIENT]: [
    Permission.QUERY_EXECUTE
  ]
};

export class AuthorizationService {
  // Check if user has permission
  hasPermission(user: User, permission: Permission): boolean {
    const rolePermissions = ROLE_PERMISSIONS[user.role];
    return rolePermissions.includes(permission);
  }
  
  // Middleware: Require permission
  requirePermission(permission: Permission) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      if (!this.hasPermission(user, permission)) {
        await this.logUnauthorizedAccess(user, permission);
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      next();
    };
  }
  
  // Middleware: Require any of these permissions
  requireAnyPermission(permissions: Permission[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const hasAnyPermission = permissions.some(p => 
        this.hasPermission(user, p)
      );
      
      if (!hasAnyPermission) {
        await this.logUnauthorizedAccess(user, permissions);
        return res.status(403).json({ error: 'Forbidden' });
      }
      
      next();
    };
  }
}
```

---

## Data Encryption

### Encryption at Rest

```typescript
// Encryption service for sensitive data
import crypto from 'crypto';

export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32; // 256 bits
  
  // Encrypt sensitive data
  encrypt(plaintext: string, key: Buffer): EncryptedData {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      ciphertext: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  // Decrypt sensitive data
  decrypt(encryptedData: EncryptedData, key: Buffer): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      key,
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  // Generate encryption key from password (PBKDF2)
  deriveKey(password: string, salt: Buffer): Buffer {
    return crypto.pbkdf2Sync(
      password,
      salt,
      100000, // iterations
      this.keyLength,
      'sha256'
    );
  }
}

// Field-level encryption for profile data
export class ProfileEncryption {
  private encryption: EncryptionService;
  private key: Buffer;
  
  constructor() {
    this.encryption = new EncryptionService();
    // Load encryption key from secure vault
    this.key = this.loadEncryptionKey();
  }
  
  // Encrypt sensitive profile fields
  encryptProfile(profile: DigitalTwinProfile): EncryptedProfile {
    return {
      ...profile,
      
      // Encrypt personal information
      email: this.encryption.encrypt(profile.email, this.key),
      phone: profile.phone ? this.encryption.encrypt(profile.phone, this.key) : null,
      address: profile.address ? this.encryption.encrypt(
        JSON.stringify(profile.address), 
        this.key
      ) : null,
      
      // Encrypt sensitive career data
      salaryHistory: profile.salaryHistory?.map(s => ({
        ...s,
        amount: this.encryption.encrypt(s.amount.toString(), this.key)
      })),
      
      // Non-sensitive data remains unencrypted for vector search
      name: profile.name,
      skills: profile.skills,
      experience: profile.experience
    };
  }
  
  private loadEncryptionKey(): Buffer {
    // In production: Load from AWS Secrets Manager / HashiCorp Vault
    const encryptionKey = process.env.PROFILE_ENCRYPTION_KEY;
    if (!encryptionKey) {
      throw new Error('PROFILE_ENCRYPTION_KEY not set');
    }
    return Buffer.from(encryptionKey, 'hex');
  }
}
```

### Encryption in Transit (TLS/SSL)

```typescript
// TLS configuration for HTTPS
import https from 'https';
import fs from 'fs';

export const tlsConfig = {
  // TLS 1.2 and 1.3 only
  minVersion: 'TLSv1.2' as const,
  maxVersion: 'TLSv1.3' as const,
  
  // Strong cipher suites only
  ciphers: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-GCM-SHA256'
  ].join(':'),
  
  // Prefer server cipher order
  honorCipherOrder: true,
  
  // Certificate configuration
  key: fs.readFileSync('/etc/ssl/private/digitaltwin.key'),
  cert: fs.readFileSync('/etc/ssl/certs/digitaltwin.crt'),
  ca: fs.readFileSync('/etc/ssl/certs/ca-bundle.crt'),
  
  // OCSP stapling
  requestCert: false,
  rejectUnauthorized: true
};

// Create HTTPS server
export function createSecureServer(app: Express): https.Server {
  return https.createServer(tlsConfig, app);
}

// Force HTTPS redirect
export function forceHttps(req: Request, res: Response, next: NextFunction) {
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    next();
  } else {
    res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
}
```

---

## Security Headers

```typescript
// Security headers middleware
import helmet from 'helmet';

export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // For Next.js
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.digitaltwin.com'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  
  // Strict Transport Security (HSTS)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // Prevent clickjacking
  frameguard: {
    action: 'deny'
  },
  
  // Prevent MIME sniffing
  noSniff: true,
  
  // XSS protection
  xssFilter: true,
  
  // Referrer policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  
  // Permissions policy
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none'
  }
});

// Additional custom headers
export function customSecurityHeaders(req: Request, res: Response, next: NextFunction) {
  // Remove server header
  res.removeHeader('X-Powered-By');
  
  // Add custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  next();
}
```

---

## Input Validation & Sanitization

```typescript
// Input validation with Zod
import { z } from 'zod';

// Query validation schema
export const querySchema = z.object({
  question: z.string()
    .min(1, 'Question cannot be empty')
    .max(500, 'Question too long')
    .transform(str => sanitizeInput(str)),
  
  topK: z.number()
    .int()
    .min(1)
    .max(10)
    .default(3),
  
  includeMetadata: z.boolean().default(true)
});

// Profile update validation
export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  
  skills: z.array(z.object({
    name: z.string().min(1).max(50),
    proficiency: z.number().min(1).max(5),
    yearsExperience: z.number().min(0).max(50)
  })).optional(),
  
  experience: z.array(z.object({
    company: z.string().min(1).max(100),
    title: z.string().min(1).max(100),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    description: z.string().max(1000)
  })).optional()
});

// Sanitize user input
function sanitizeInput(input: string): string {
  // Remove potential XSS vectors
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

// Validation middleware
export function validateRequest<T extends z.ZodType>(schema: T) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      }
      next(error);
    }
  };
}
```

---

## Rate Limiting & DDoS Protection

```typescript
// Rate limiting with Redis
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

// Create Redis client for rate limiting
const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD
});

// Tiered rate limiting
export const rateLimiters = {
  // Global rate limit
  global: rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:global:'
    }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Max 1000 requests per window
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  }),
  
  // Authentication endpoints (stricter)
  auth: rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:auth:'
    }),
    windowMs: 15 * 60 * 1000,
    max: 5, // Max 5 login attempts per 15 minutes
    skipSuccessfulRequests: true
  }),
  
  // Query endpoints
  query: rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:query:'
    }),
    windowMs: 60 * 1000, // 1 minute
    max: async (req) => {
      // Different limits based on user tier
      const user = req.user;
      if (!user) return 10; // Anonymous: 10/min
      
      switch (user.tier) {
        case 'free': return 10;
        case 'professional': return 100;
        case 'enterprise': return 1000;
        default: return 10;
      }
    }
  }),
  
  // Profile update endpoints
  update: rateLimit({
    store: new RedisStore({
      client: redisClient,
      prefix: 'rl:update:'
    }),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10 // Max 10 profile updates per hour
  })
};

// IP-based blocking for malicious actors
export class IPBlocker {
  private blockedIPs: Set<string> = new Set();
  
  async blockIP(ip: string, duration: number = 3600): Promise<void> {
    this.blockedIPs.add(ip);
    await redisClient.setex(`blocked:${ip}`, duration, '1');
    
    // Audit log
    await this.logBlock(ip, duration);
  }
  
  async isBlocked(ip: string): Promise<boolean> {
    return this.blockedIPs.has(ip) || 
           await redisClient.exists(`blocked:${ip}`) === 1;
  }
  
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const ip = req.ip || req.connection.remoteAddress;
      
      if (ip && await this.isBlocked(ip)) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      next();
    };
  }
}
```

---

## Compliance & Data Protection

### GDPR Compliance

```typescript
// GDPR compliance implementation
export class GDPRCompliance {
  // Right to access
  async exportUserData(userId: string): Promise<UserDataExport> {
    const profile = await this.getProfile(userId);
    const queryHistory = await this.getQueryHistory(userId);
    const auditLogs = await this.getAuditLogs(userId);
    const apiKeys = await this.getApiKeys(userId);
    
    return {
      profile,
      queryHistory,
      auditLogs,
      apiKeys: apiKeys.map(k => ({
        id: k.id,
        name: k.name,
        createdAt: k.createdAt,
        lastUsedAt: k.lastUsedAt
        // Never export actual keys
      })),
      exportedAt: new Date(),
      format: 'JSON'
    };
  }
  
  // Right to be forgotten
  async deleteUserData(userId: string): Promise<DeletionReport> {
    const deletionReport: DeletionReport = {
      userId,
      deletedAt: new Date(),
      items: []
    };
    
    // Delete profile from vector database
    await this.vectorDB.delete({ userId });
    deletionReport.items.push({ type: 'vector_data', count: 1 });
    
    // Delete profile versions
    const versions = await this.db.profileVersions.delete({ userId });
    deletionReport.items.push({ type: 'profile_versions', count: versions });
    
    // Anonymize query history (keep for analytics)
    const queries = await this.db.queries.anonymize({ userId });
    deletionReport.items.push({ type: 'queries_anonymized', count: queries });
    
    // Delete API keys
    const apiKeys = await this.db.apiKeys.delete({ userId });
    deletionReport.items.push({ type: 'api_keys', count: apiKeys });
    
    // Archive audit logs (required for compliance)
    await this.archiveAuditLogs(userId);
    deletionReport.items.push({ type: 'audit_logs', status: 'archived' });
    
    // Audit the deletion
    await this.logAudit({
      action: 'user_data_deleted',
      userId,
      timestamp: new Date(),
      report: deletionReport
    });
    
    return deletionReport;
  }
  
  // Right to rectification
  async updateUserData(
    userId: string, 
    updates: Partial<DigitalTwinProfile>
  ): Promise<void> {
    await this.profileManager.updateProfile(updates, userId, 'user_request');
    
    // Audit log
    await this.logAudit({
      action: 'user_data_updated',
      userId,
      fields: Object.keys(updates),
      timestamp: new Date()
    });
  }
  
  // Data portability
  async exportUserDataPortable(userId: string, format: 'json' | 'csv' | 'xml'): Promise<Buffer> {
    const data = await this.exportUserData(userId);
    
    switch (format) {
      case 'json':
        return Buffer.from(JSON.stringify(data, null, 2));
      case 'csv':
        return this.convertToCSV(data);
      case 'xml':
        return this.convertToXML(data);
    }
  }
}
```

### Data Retention Policy

```typescript
// Data retention configuration
export const retentionPolicy = {
  profileData: {
    active: 'indefinite', // While account is active
    afterDeletion: 30 // days - for recovery
  },
  
  queryHistory: {
    detailed: 90, // days - full query details
    anonymized: 365 // days - anonymized for analytics
  },
  
  auditLogs: {
    security: 2555, // days (~7 years) - compliance requirement
    general: 365 // days
  },
  
  sessionData: {
    active: 7, // days
    expired: 0 // Immediate deletion
  },
  
  apiKeys: {
    active: 365, // days
    revoked: 90 // days
  }
};

// Automated data cleanup job
export class DataRetentionJob {
  async run(): Promise<void> {
    await this.cleanupExpiredSessions();
    await this.cleanupOldQueryHistory();
    await this.archiveOldAuditLogs();
    await this.deleteRevokedApiKeys();
  }
  
  private async cleanupExpiredSessions(): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionPolicy.sessionData.active);
    
    await this.db.sessions.delete({
      lastActivityAt: { $lt: cutoffDate }
    });
  }
  
  private async cleanupOldQueryHistory(): Promise<void> {
    const detailedCutoff = new Date();
    detailedCutoff.setDate(detailedCutoff.getDate() - retentionPolicy.queryHistory.detailed);
    
    const anonymizedCutoff = new Date();
    anonymizedCutoff.setDate(anonymizedCutoff.getDate() - retentionPolicy.queryHistory.anonymized);
    
    // Anonymize old detailed queries
    await this.db.queries.anonymize({
      createdAt: { $lt: detailedCutoff }
    });
    
    // Delete old anonymized queries
    await this.db.queries.delete({
      anonymized: true,
      createdAt: { $lt: anonymizedCutoff }
    });
  }
}
```

---

## Audit Trail System

```typescript
// Comprehensive audit logging
export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  action: AuditAction;
  resourceType: string;
  resourceId?: string;
  changes?: Record<string, { old: any; new: any }>;
  metadata: {
    ipAddress: string;
    userAgent: string;
    platform: string;
    requestId: string;
  };
  result: 'success' | 'failure';
  errorMessage?: string;
}

export enum AuditAction {
  // Authentication
  LOGIN = 'auth.login',
  LOGOUT = 'auth.logout',
  LOGIN_FAILED = 'auth.login_failed',
  PASSWORD_CHANGED = 'auth.password_changed',
  
  // Profile
  PROFILE_VIEWED = 'profile.viewed',
  PROFILE_UPDATED = 'profile.updated',
  PROFILE_DELETED = 'profile.deleted',
  
  // Queries
  QUERY_EXECUTED = 'query.executed',
  
  // API Keys
  API_KEY_CREATED = 'api_key.created',
  API_KEY_REVOKED = 'api_key.revoked',
  
  // Data
  DATA_EXPORTED = 'data.exported',
  DATA_DELETED = 'data.deleted',
  
  // Security
  UNAUTHORIZED_ACCESS = 'security.unauthorized_access',
  SUSPICIOUS_ACTIVITY = 'security.suspicious_activity',
  IP_BLOCKED = 'security.ip_blocked'
}

export class AuditLogger {
  async log(auditLog: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const log: AuditLog = {
      id: generateId(),
      timestamp: new Date(),
      ...auditLog
    };
    
    // Write to database (WORM storage)
    await this.db.auditLogs.insert(log);
    
    // Write to secure log file
    await this.writeToSecureLog(log);
    
    // Alert on critical events
    if (this.isCriticalEvent(log.action)) {
      await this.sendSecurityAlert(log);
    }
  }
  
  // Query audit logs
  async queryLogs(filter: AuditLogFilter): Promise<AuditLog[]> {
    return await this.db.auditLogs.find(filter);
  }
  
  // Generate audit report
  async generateReport(
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<AuditReport> {
    const logs = await this.db.auditLogs.find({
      userId,
      timestamp: { $gte: startDate, $lte: endDate }
    });
    
    return {
      userId,
      period: { start: startDate, end: endDate },
      totalEvents: logs.length,
      eventsByType: this.groupByAction(logs),
      securityEvents: logs.filter(l => l.action.startsWith('security.')),
      failedActions: logs.filter(l => l.result === 'failure')
    };
  }
  
  private isCriticalEvent(action: AuditAction): boolean {
    return [
      AuditAction.UNAUTHORIZED_ACCESS,
      AuditAction.SUSPICIOUS_ACTIVITY,
      AuditAction.DATA_DELETED,
      AuditAction.IP_BLOCKED
    ].includes(action);
  }
}
```

---

## Security Monitoring & Alerts

```typescript
// Security event detection
export class SecurityMonitor {
  private readonly alertThresholds = {
    failedLogins: { count: 5, window: 300 }, // 5 failures in 5 minutes
    rapidQueries: { count: 100, window: 60 }, // 100 queries in 1 minute
    suspiciousIPs: { count: 3, window: 3600 } // 3 different IPs in 1 hour
  };
  
  async detectAnomalies(userId: string): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];
    
    // Check for failed login attempts
    const failedLogins = await this.countRecentEvents(
      userId,
      AuditAction.LOGIN_FAILED,
      this.alertThresholds.failedLogins.window
    );
    
    if (failedLogins >= this.alertThresholds.failedLogins.count) {
      alerts.push({
        type: 'brute_force_attempt',
        severity: 'high',
        userId,
        message: `${failedLogins} failed login attempts detected`,
        action: 'account_locked'
      });
    }
    
    // Check for rapid queries (potential scraping)
    const recentQueries = await this.countRecentEvents(
      userId,
      AuditAction.QUERY_EXECUTED,
      this.alertThresholds.rapidQueries.window
    );
    
    if (recentQueries >= this.alertThresholds.rapidQueries.count) {
      alerts.push({
        type: 'rate_limit_abuse',
        severity: 'medium',
        userId,
        message: `${recentQueries} queries in ${this.alertThresholds.rapidQueries.window}s`,
        action: 'rate_limited'
      });
    }
    
    // Check for suspicious IP patterns
    const uniqueIPs = await this.countUniqueIPs(userId, 3600);
    if (uniqueIPs >= this.alertThresholds.suspiciousIPs.count) {
      alerts.push({
        type: 'multiple_ips',
        severity: 'medium',
        userId,
        message: `Account accessed from ${uniqueIPs} different IPs`,
        action: 'require_mfa'
      });
    }
    
    return alerts;
  }
  
  async handleSecurityAlert(alert: SecurityAlert): Promise<void> {
    // Log to audit trail
    await this.auditLogger.log({
      userId: alert.userId,
      action: AuditAction.SUSPICIOUS_ACTIVITY,
      resourceType: 'security_alert',
      metadata: alert,
      result: 'success'
    });
    
    // Take automated action
    switch (alert.action) {
      case 'account_locked':
        await this.lockAccount(alert.userId);
        break;
      case 'rate_limited':
        await this.applyStrictRateLimit(alert.userId);
        break;
      case 'require_mfa':
        await this.requireMFAVerification(alert.userId);
        break;
    }
    
    // Notify security team
    await this.notifySecurityTeam(alert);
  }
}
```

---

## Secrets Management

```typescript
// AWS Secrets Manager integration
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

export class SecretsManager {
  private client: SecretsManagerClient;
  private cache: Map<string, { value: string; expiresAt: number }> = new Map();
  
  constructor() {
    this.client = new SecretsManagerClient({
      region: process.env.AWS_REGION || 'us-east-1'
    });
  }
  
  async getSecret(secretName: string): Promise<string> {
    // Check cache first
    const cached = this.cache.get(secretName);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
    
    // Fetch from AWS Secrets Manager
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await this.client.send(command);
    
    const secretValue = response.SecretString;
    if (!secretValue) {
      throw new Error(`Secret ${secretName} not found`);
    }
    
    // Cache for 5 minutes
    this.cache.set(secretName, {
      value: secretValue,
      expiresAt: Date.now() + 5 * 60 * 1000
    });
    
    return secretValue;
  }
  
  // Rotate secrets automatically
  async rotateSecret(secretName: string, newValue: string): Promise<void> {
    // Implementation depends on secret type
    // For API keys, database passwords, etc.
  }
}

// Load secrets on startup
export async function loadSecrets(): Promise<void> {
  const secretsManager = new SecretsManager();
  
  process.env.UPSTASH_VECTOR_REST_TOKEN = await secretsManager.getSecret(
    'digitaltwin/upstash/vector-token'
  );
  
  process.env.GROQ_API_KEY = await secretsManager.getSecret(
    'digitaltwin/groq/api-key'
  );
  
  process.env.JWT_SECRET = await secretsManager.getSecret(
    'digitaltwin/jwt/secret'
  );
  
  process.env.PROFILE_ENCRYPTION_KEY = await secretsManager.getSecret(
    'digitaltwin/encryption/profile-key'
  );
}
```

---

## Security Checklist

### Production Deployment

- [x] **Authentication & Authorization**
  - [x] OAuth 2.0 / OIDC implemented
  - [x] JWT token validation
  - [x] API key management
  - [x] RBAC configured
  - [x] MFA for admin accounts

- [x] **Data Protection**
  - [x] Encryption at rest (AES-256)
  - [x] Encryption in transit (TLS 1.3)
  - [x] Field-level encryption for PII
  - [x] Secure key management
  - [x] Data anonymization for analytics

- [x] **Network Security**
  - [x] HTTPS enforced
  - [x] Security headers configured
  - [x] CORS properly configured
  - [x] Rate limiting enabled
  - [x] DDoS protection active

- [x] **Input Validation**
  - [x] Request validation (Zod schemas)
  - [x] SQL injection prevention
  - [x] XSS protection
  - [x] CSRF tokens
  - [x] File upload restrictions

- [x] **Monitoring & Logging**
  - [x] Comprehensive audit trail
  - [x] Security event detection
  - [x] Automated alerts
  - [x] Log retention policy
  - [x] Incident response plan

- [x] **Compliance**
  - [x] GDPR compliance
  - [x] Data retention policies
  - [x] Privacy policy
  - [x] Terms of service
  - [x] SOC 2 audit readiness

---

**Next:** [Scalability Patterns](SCALABILITY_PATTERNS.md) | [Monitoring & Analytics](MONITORING_ANALYTICS.md)
