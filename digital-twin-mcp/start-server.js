#!/usr/bin/env node

/**
 * MCP Server Launcher
 * Loads environment variables from .env.local before starting the server
 */

const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value.trim();
      }
    }
  });
  console.error('✓ Loaded environment variables from .env.local');
} else {
  console.error('⚠️  Warning: .env.local not found');
}

// Now require the actual server
require('./dist/server/index.js');
