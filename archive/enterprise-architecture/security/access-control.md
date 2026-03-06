# Access Control Implementation

## Role-Based Access Control (RBAC)

### User Roles

| Role | Permissions | Use Case |
|------|-------------|----------|
| **Owner** | Full system access | Profile owner |
| **Admin** | Manage settings, view data | Trusted administrators |
| **Editor** | Update profile content | Content collaborators |
| **Viewer** | Read-only access | Recruiters, hiring managers |
| **API Client** | Programmatic query access | Automation tools |

### Permission Matrix

| Resource | Owner | Admin | Editor | Viewer | API Client |
|----------|-------|-------|--------|--------|------------|
| **Profile - Read** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Profile - Update** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Profile - Delete** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Query - Execute** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Query - History** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Settings - Read** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Settings - Update** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **API Keys - Create** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **API Keys - Revoke** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **API Keys - List** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Audit Logs - Read** | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## Implementation

### User Model

```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  createdAt: Date;
  lastLoginAt: Date;
  mfaEnabled: boolean;
  tier: 'free' | 'professional' | 'enterprise';
}

enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
  API_CLIENT = 'api_client'
}

enum Permission {
  PROFILE_READ = 'profile:read',
  PROFILE_UPDATE = 'profile:update',
  PROFILE_DELETE = 'profile:delete',
  QUERY_EXECUTE = 'query:execute',
  QUERY_HISTORY = 'query:history',
  SETTINGS_READ = 'settings:read',
  SETTINGS_UPDATE = 'settings:update',
  API_KEY_CREATE = 'api_key:create',
  API_KEY_REVOKE = 'api_key:revoke',
  API_KEY_LIST = 'api_key:list',
  AUDIT_READ = 'audit:read'
}
```

### Authorization Middleware

```typescript
export class AuthorizationMiddleware {
  requirePermission(permission: Permission) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }
      
      if (!this.hasPermission(user, permission)) {
        // Log unauthorized access attempt
        await auditLogger.log({
          userId: user.id,
          action: AuditAction.UNAUTHORIZED_ACCESS,
          resourceType: permission,
          result: 'failure',
          metadata: {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            platform: req.headers['x-platform'],
            requestId: req.requestId
          }
        });
        
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient permissions'
        });
      }
      
      next();
    };
  }
  
  private hasPermission(user: User, permission: Permission): boolean {
    const rolePermissions = ROLE_PERMISSIONS[user.role];
    return rolePermissions.includes(permission);
  }
}
```

---

## API Key Management

### API Key Structure

```typescript
interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;         // First 8 chars for identification
  hashedKey: string;         // bcrypt hash
  scopes: string[];          // Limited permissions
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date;
  revokedAt: Date | null;
  ipWhitelist: string[];     // Optional IP restrictions
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
}
```

### Creating API Keys

```typescript
export class ApiKeyService {
  async createApiKey(
    userId: string,
    name: string,
    scopes: string[],
    options?: {
      expiresInDays?: number;
      ipWhitelist?: string[];
      rateLimit?: RateLimit;
    }
  ): Promise<{ key: string; apiKey: ApiKey }> {
    // Generate cryptographically secure key
    const key = `dtwin_${crypto.randomBytes(32).toString('hex')}`;
    const hashedKey = await bcrypt.hash(key, 12);
    
    const apiKey: ApiKey = {
      id: generateId(),
      userId,
      name,
      keyPrefix: key.substring(0, 8),
      hashedKey,
      scopes,
      createdAt: new Date(),
      lastUsedAt: null,
      expiresAt: new Date(Date.now() + (options?.expiresInDays || 365) * 24 * 60 * 60 * 1000),
      revokedAt: null,
      ipWhitelist: options?.ipWhitelist || [],
      rateLimit: options?.rateLimit || {
        requestsPerMinute: 60,
        requestsPerDay: 10000
      }
    };
    
    await db.apiKeys.insert(apiKey);
    
    // Audit log
    await auditLogger.log({
      userId,
      action: AuditAction.API_KEY_CREATED,
      resourceType: 'api_key',
      resourceId: apiKey.id,
      result: 'success',
      metadata: {
        name,
        scopes,
        expiresAt: apiKey.expiresAt
      }
    });
    
    // Return key only once (never stored in plaintext)
    return { key, apiKey };
  }
  
  async validateApiKey(key: string, ipAddress: string): Promise<User | null> {
    const hashedKey = await bcrypt.hash(key, 12);
    const apiKey = await db.apiKeys.findOne({ hashedKey, revokedAt: null });
    
    if (!apiKey) {
      return null;
    }
    
    // Check expiration
    if (apiKey.expiresAt < new Date()) {
      throw new ApiKeyError('API key expired', 401);
    }
    
    // Check IP whitelist
    if (apiKey.ipWhitelist.length > 0 && !apiKey.ipWhitelist.includes(ipAddress)) {
      throw new ApiKeyError('IP address not whitelisted', 403);
    }
    
    // Check rate limit
    const usage = await this.checkRateLimit(apiKey.id);
    if (usage.exceeded) {
      throw new ApiKeyError('Rate limit exceeded', 429);
    }
    
    // Update last used timestamp
    await db.apiKeys.update(
      { id: apiKey.id },
      { lastUsedAt: new Date() }
    );
    
    // Return user with API client role
    return {
      id: apiKey.userId,
      role: UserRole.API_CLIENT,
      permissions: apiKey.scopes as Permission[],
      ...await db.users.findById(apiKey.userId)
    };
  }
}
```

---

## Multi-Factor Authentication (MFA)

### MFA Setup

```typescript
export class MFAService {
  async enableMFA(userId: string): Promise<{ secret: string; qrCode: string }> {
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `DigitalTwin (${user.email})`,
      length: 32
    });
    
    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    
    // Save secret (encrypted)
    await db.users.update(
      { id: userId },
      {
        mfaSecret: await this.encryptSecret(secret.base32),
        mfaEnabled: false  // Not enabled until verified
      }
    });
    
    return {
      secret: secret.base32,
      qrCode
    };
  }
  
  async verifyMFASetup(userId: string, token: string): Promise<boolean> {
    const user = await db.users.findById(userId);
    const secret = await this.decryptSecret(user.mfaSecret);
    
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2  // Allow 2 time steps (±1 minute)
    });
    
    if (verified) {
      await db.users.update(
        { id: userId },
        { mfaEnabled: true }
      );
      
      // Generate backup codes
      const backupCodes = await this.generateBackupCodes(userId);
      
      return true;
    }
    
    return false;
  }
  
  async verifyMFAToken(userId: string, token: string): Promise<boolean> {
    const user = await db.users.findById(userId);
    
    if (!user.mfaEnabled) {
      return true;  // MFA not required
    }
    
    const secret = await this.decryptSecret(user.mfaSecret);
    
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2
    });
  }
}
```

---

## IP Whitelisting

```typescript
export class IPWhitelistService {
  async addToWhitelist(userId: string, ipAddress: string, description: string): Promise<void> {
    await db.ipWhitelist.insert({
      userId,
      ipAddress,
      description,
      createdAt: new Date(),
      lastUsedAt: null
    });
    
    await auditLogger.log({
      userId,
      action: 'ip_whitelisted',
      resourceType: 'ip_whitelist',
      metadata: { ipAddress, description },
      result: 'success'
    });
  }
  
  async isWhitelisted(userId: string, ipAddress: string): Promise<boolean> {
    const entry = await db.ipWhitelist.findOne({ userId, ipAddress });
    
    if (entry) {
      // Update last used
      await db.ipWhitelist.update(
        { id: entry.id },
        { lastUsedAt: new Date() }
      );
      return true;
    }
    
    return false;
  }
}
```

---

## Session Management

```typescript
export class SessionService {
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000;  // 24 hours
  private readonly MAX_SESSIONS_PER_USER = 5;
  
  async createSession(userId: string, metadata: SessionMetadata): Promise<Session> {
    // Check concurrent session limit
    const activeSessions = await db.sessions.count({
      userId,
      expiresAt: { $gt: new Date() }
    });
    
    if (activeSessions >= this.MAX_SESSIONS_PER_USER) {
      // Remove oldest session
      await this.removeOldestSession(userId);
    }
    
    const session: Session = {
      id: generateId(),
      userId,
      token: await this.generateSessionToken(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.SESSION_DURATION),
      lastActivityAt: new Date(),
      metadata: {
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        platform: metadata.platform
      }
    };
    
    await db.sessions.insert(session);
    
    return session;
  }
  
  async validateSession(token: string): Promise<Session | null> {
    const session = await db.sessions.findOne({ token });
    
    if (!session) {
      return null;
    }
    
    // Check expiration
    if (session.expiresAt < new Date()) {
      await db.sessions.delete({ id: session.id });
      return null;
    }
    
    // Update last activity
    await db.sessions.update(
      { id: session.id },
      { lastActivityAt: new Date() }
    );
    
    return session;
  }
  
  async revokeSession(sessionId: string): Promise<void> {
    await db.sessions.delete({ id: sessionId });
  }
  
  async revokeAllSessions(userId: string): Promise<void> {
    await db.sessions.delete({ userId });
  }
}
```

---

## Principle of Least Privilege

### Resource-Level Permissions

```typescript
export class ResourcePermissions {
  async canAccessProfile(userId: string, profileId: string): Promise<boolean> {
    // Check if user owns the profile
    const profile = await db.profiles.findById(profileId);
    if (profile.userId === userId) {
      return true;
    }
    
    // Check if user has been granted access
    const access = await db.profileAccess.findOne({
      profileId,
      grantedTo: userId,
      expiresAt: { $gt: new Date() }
    });
    
    return !!access;
  }
  
  async grantAccess(
    profileId: string,
    grantedBy: string,
    grantedTo: string,
    permissions: Permission[],
    expiresInDays: number = 30
  ): Promise<void> {
    // Verify grantor has permission to grant access
    if (!await this.canAccessProfile(grantedBy, profileId)) {
      throw new Error('Insufficient permissions to grant access');
    }
    
    await db.profileAccess.insert({
      profileId,
      grantedBy,
      grantedTo,
      permissions,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
    });
    
    await auditLogger.log({
      userId: grantedBy,
      action: 'access_granted',
      resourceType: 'profile',
      resourceId: profileId,
      metadata: {
        grantedTo,
        permissions,
        expiresInDays
      },
      result: 'success'
    });
  }
}
```

---

## Access Control Best Practices

### 1. Default Deny
- All access denied by default
- Explicitly grant permissions
- Regular permission audits

### 2. Separation of Duties
- No single user has complete control
- Critical operations require multiple approvals
- Admin actions logged and reviewed

### 3. Time-Based Access
- Temporary access grants
- Automatic expiration
- Just-in-time access provisioning

### 4. Context-Aware Access
- IP-based restrictions
- Device fingerprinting
- Geolocation validation
- Time-of-day restrictions

### 5. Regular Reviews
- Quarterly access reviews
- Automatic revocation of unused permissions
- Compliance reporting

---

**Status:** Access Control Implementation Complete ✅
