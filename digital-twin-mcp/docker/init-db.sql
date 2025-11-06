-- Initialize PostgreSQL database for Digital Twin MCP Server
-- 100% FREE - PostgreSQL is open-source

-- Create audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    
    -- Timestamp
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Actor (who performed the action)
    user_id VARCHAR(255),
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    actor_type VARCHAR(50),
    api_key_id VARCHAR(255),
    
    -- Target (what was affected)
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    resource_name VARCHAR(255),
    
    -- Action details
    action TEXT NOT NULL,
    result VARCHAR(20) NOT NULL,
    error_code VARCHAR(100),
    error_message TEXT,
    
    -- Context
    ip_address VARCHAR(45),
    user_agent TEXT,
    platform VARCHAR(50),
    request_id VARCHAR(255),
    session_id VARCHAR(255),
    
    -- Geolocation (optional)
    geo_country VARCHAR(100),
    geo_city VARCHAR(100),
    
    -- Changes (JSONB for flexible storage)
    changes JSONB,
    
    -- Additional metadata
    metadata JSONB,
    
    -- Data integrity
    signature VARCHAR(512),
    previous_log_hash VARCHAR(64),
    
    -- Indexes for common queries
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_category ON audit_logs(category);
CREATE INDEX idx_audit_logs_severity ON audit_logs(severity);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id);

-- Create users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'viewer',
    
    -- Account status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMPTZ,
    
    -- Security
    last_login TIMESTAMPTZ,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- MFA
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Create API keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    key_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,
    
    -- Metadata
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Permissions
    scopes JSONB DEFAULT '[]'::jsonb,
    
    -- Usage limits
    rate_limit INT DEFAULT 100,
    rate_limit_window VARCHAR(20) DEFAULT 'hour',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

-- Indexes for API keys
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Session data
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for sessions
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Create rate limit tracking table
CREATE TABLE IF NOT EXISTS rate_limits (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL, -- user_id, ip_address, or api_key
    endpoint VARCHAR(255) NOT NULL,
    
    -- Tracking
    request_count INT DEFAULT 0,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    
    -- Unique constraint
    UNIQUE(identifier, endpoint, window_start)
);

-- Indexes for rate limits
CREATE INDEX idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX idx_rate_limits_window_end ON rate_limits(window_end);

-- Create query cache table (optional, for caching LLM responses)
CREATE TABLE IF NOT EXISTS query_cache (
    id SERIAL PRIMARY KEY,
    query_hash VARCHAR(64) UNIQUE NOT NULL,
    query_text TEXT NOT NULL,
    response TEXT NOT NULL,
    
    -- Cache metadata
    hit_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_accessed TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for query cache
CREATE INDEX idx_query_cache_expires_at ON query_cache(expires_at);
CREATE INDEX idx_query_cache_query_hash ON query_cache(query_hash);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123 - CHANGE IN PRODUCTION!)
-- Password hash generated with bcrypt
INSERT INTO users (user_id, email, password_hash, full_name, role, is_active, is_verified, email_verified_at)
VALUES (
    'admin-001',
    'admin@digitaltwin.local',
    '$2a$10$N9qo8uLOickgx2ZMRZoMye.IjJp5Z.JFC5kpJvH3qJ8xYrGKiZDfW', -- admin123
    'System Administrator',
    'admin',
    true,
    true,
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Database initialization completed successfully!';
    RAISE NOTICE 'Default admin user: admin@digitaltwin.local / admin123';
    RAISE NOTICE 'IMPORTANT: Change default password in production!';
END $$;
