---
name: server
description: REST API server with CORS, compression, and rate limiting
tags: [server, api, rest, http, cors]
category: operations
priority: P1
---

# Server Skill

## Overview

Master REST API server operations for exposing vector database over HTTP. Configure CORS, compression, rate limiting, and authentication for production deployments.

## Available Operations

### 1. Start Server

```bash
# CLI
ruvector-flow server start --port 8080 --host 0.0.0.0

# MCP Tool
{
  "tool": "server_start",
  "port": 8080,
  "host": "0.0.0.0"
}
```

### 2. Stop Server

```bash
# CLI
ruvector-flow server stop

# MCP Tool
{
  "tool": "server_stop"
}
```

### 3. Server Status

```bash
# CLI
ruvector-flow server status

# MCP Tool
{
  "tool": "server_status"
}
```

### 4. Configure CORS

```bash
# CLI
ruvector-flow server cors --origins "https://app.example.com,https://admin.example.com"

# MCP Tool
{
  "tool": "server_cors",
  "origins": ["https://app.example.com", "https://admin.example.com"]
}
```

### 5. Enable Compression

```bash
# CLI
ruvector-flow server compression --enabled true --level 6

# MCP Tool
{
  "tool": "server_compression",
  "enabled": true,
  "level": 6
}
```

### 6. Configure Rate Limiting

```bash
# CLI
ruvector-flow server rate-limit --max-requests 100 --window 60

# MCP Tool
{
  "tool": "server_rate_limit",
  "max_requests": 100,
  "window_seconds": 60
}
```

## Example Usage

### Basic Server Setup

```typescript
import { RuvectorFlow } from '@ruvector/flow';

const db = new RuvectorFlow();

// Start REST API server
await db.server.start({
  port: 8080,
  host: '0.0.0.0',

  cors: {
    origins: ['https://app.example.com'],
    credentials: true
  },

  compression: {
    enabled: true,
    level: 6,
    threshold: 1024  // Compress responses >1KB
  },

  rateLimit: {
    max: 100,        // 100 requests
    windowMs: 60000  // per minute
  }
});

console.log('Server running on http://localhost:8080');
```

### REST API Endpoints

```typescript
// Automatic REST API endpoints:

// Collections
// GET    /collections              - List collections
// POST   /collections              - Create collection
// GET    /collections/:name        - Get collection info
// DELETE /collections/:name        - Delete collection

// Vectors
// POST   /collections/:name/vectors              - Insert vector
// POST   /collections/:name/vectors/batch        - Batch insert
// GET    /collections/:name/vectors/:id          - Get vector
// PUT    /collections/:name/vectors/:id          - Update vector
// DELETE /collections/:name/vectors/:id          - Delete vector
// POST   /collections/:name/search               - Search vectors
// GET    /collections/:name/vectors              - Scroll vectors
// GET    /collections/:name/count                - Count vectors

// Index
// POST   /collections/:name/index                - Create index
// GET    /collections/:name/index                - Get index stats
// POST   /collections/:name/index/rebuild        - Rebuild index
// DELETE /collections/:name/index                - Delete index

// Health
// GET    /health                                  - Health check
// GET    /ready                                   - Readiness probe
// GET    /metrics                                 - Prometheus metrics
```

### Client Usage

```typescript
// TypeScript client
class RuvectorClient {
  constructor(private baseUrl: string) {}

  async search(collection: string, query: number[], k: number = 10) {
    const response = await fetch(`${this.baseUrl}/collections/${collection}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query, k })
    });

    return response.json();
  }

  async insert(collection: string, id: string, vector: number[], metadata?: any) {
    const response = await fetch(`${this.baseUrl}/collections/${collection}/vectors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id, vector, metadata })
    });

    return response.json();
  }
}

// Usage
const client = new RuvectorClient('http://localhost:8080');

const results = await client.search('docs', queryVector, 10);
console.log('Search results:', results);
```

### CORS Configuration

```typescript
// Development (allow all)
await db.server.configure({
  cors: {
    origins: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: false
  }
});

// Production (restricted)
await db.server.configure({
  cors: {
    origins: [
      'https://app.example.com',
      'https://admin.example.com'
    ],
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400  // Cache preflight for 24h
  }
});

// Dynamic origin validation
await db.server.configure({
  cors: {
    origin: (origin: string) => {
      // Allow subdomains
      return origin.endsWith('.example.com');
    }
  }
});
```

### Authentication

```typescript
// API key authentication
await db.server.configure({
  auth: {
    type: 'api-key',
    header: 'X-API-Key',
    keys: [
      { key: 'prod-key-123', name: 'production', scopes: ['read', 'write'] },
      { key: 'read-only-456', name: 'analytics', scopes: ['read'] }
    ]
  }
});

// JWT authentication
await db.server.configure({
  auth: {
    type: 'jwt',
    secret: process.env.JWT_SECRET,
    algorithms: ['HS256'],
    issuer: 'ruvector',
    audience: 'api'
  }
});

// Custom authentication
await db.server.configure({
  auth: {
    type: 'custom',
    handler: async (req: Request) => {
      const token = req.headers.get('Authorization')?.replace('Bearer ', '');
      const user = await validateToken(token);
      return user;
    }
  }
});
```

### Rate Limiting

```typescript
// Per-IP rate limiting
await db.server.configure({
  rateLimit: {
    type: 'ip',
    max: 100,
    windowMs: 60000,  // 100 requests per minute per IP
    message: 'Too many requests, please try again later'
  }
});

// Per-user rate limiting
await db.server.configure({
  rateLimit: {
    type: 'user',
    max: 1000,
    windowMs: 60000,  // 1000 requests per minute per user
    keyGenerator: (req) => req.user?.id || req.ip
  }
});

// Tiered rate limiting
await db.server.configure({
  rateLimit: {
    tiers: {
      free: { max: 100, windowMs: 60000 },
      pro: { max: 1000, windowMs: 60000 },
      enterprise: { max: 10000, windowMs: 60000 }
    },
    tierSelector: (req) => req.user?.tier || 'free'
  }
});

// Endpoint-specific limits
await db.server.configure({
  rateLimit: {
    endpoints: {
      '/search': { max: 50, windowMs: 60000 },   // 50/min for search
      '/insert': { max: 200, windowMs: 60000 },  // 200/min for insert
      default: { max: 100, windowMs: 60000 }     // 100/min for others
    }
  }
});
```

### Compression

```typescript
// Automatic compression based on content type
await db.server.configure({
  compression: {
    enabled: true,
    level: 6,  // 1-9 (9 = max compression, slower)
    threshold: 1024,  // Compress responses >1KB
    types: [
      'application/json',
      'text/plain',
      'text/html'
    ]
  }
});

// Disable compression for specific endpoints
await db.server.configure({
  compression: {
    enabled: true,
    filter: (req) => {
      // Don't compress streaming endpoints
      return !req.path.startsWith('/stream');
    }
  }
});
```

### Request/Response Logging

```typescript
// Detailed access logs
await db.server.configure({
  logging: {
    enabled: true,
    format: 'combined',  // Apache combined log format
    output: '/var/log/ruvector/access.log',

    // Custom fields
    fields: [
      'timestamp',
      'method',
      'path',
      'status',
      'duration',
      'ip',
      'user_agent',
      'user_id'
    ],

    // Filter sensitive data
    filter: (log) => {
      delete log.request.headers['authorization'];
      delete log.request.body?.api_key;
      return log;
    }
  }
});

// Example log output:
/*
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "method": "POST",
  "path": "/collections/docs/search",
  "status": 200,
  "duration": 42,
  "ip": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "user_id": "user_123",
  "request_id": "req_abc123"
}
*/
```

### Error Handling

```typescript
// Custom error responses
await db.server.configure({
  errorHandler: {
    format: 'json',
    includeStack: process.env.NODE_ENV === 'development',

    // Custom error formatter
    formatter: (error: Error, req: Request) => ({
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message,
        details: error.details,
        timestamp: Date.now(),
        request_id: req.id
      }
    })
  }
});

// Example error response:
/*
{
  "error": {
    "code": "COLLECTION_NOT_FOUND",
    "message": "Collection 'docs' does not exist",
    "details": {
      "collection": "docs",
      "available": ["embeddings", "products"]
    },
    "timestamp": 1705316445123,
    "request_id": "req_abc123"
  }
}
*/
```

### Streaming Responses

```typescript
// Server-Sent Events for real-time updates
app.get('/collections/:name/stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Stream collection changes
  const stream = db.collection.watch({ name: req.params.name });

  stream.on('insert', (vector) => {
    res.write(`event: insert\n`);
    res.write(`data: ${JSON.stringify(vector)}\n\n`);
  });

  stream.on('delete', (id) => {
    res.write(`event: delete\n`);
    res.write(`data: ${JSON.stringify({ id })}\n\n`);
  });

  req.on('close', () => {
    stream.close();
  });
});
```

### WebSocket Support

```typescript
// WebSocket for bidirectional communication
await db.server.configure({
  websocket: {
    enabled: true,
    path: '/ws',
    maxConnections: 1000,
    pingInterval: 30000  // Ping every 30s
  }
});

// Client usage
const ws = new WebSocket('ws://localhost:8080/ws');

ws.onopen = () => {
  // Send search request
  ws.send(JSON.stringify({
    action: 'search',
    collection: 'docs',
    query: queryVector,
    k: 10
  }));
};

ws.onmessage = (event) => {
  const results = JSON.parse(event.data);
  console.log('Search results:', results);
};
```

### Production Deployment

```typescript
// Production server configuration
const productionServer = {
  port: process.env.PORT || 8080,
  host: '0.0.0.0',

  // SSL/TLS
  ssl: {
    enabled: true,
    cert: '/etc/ssl/certs/server.crt',
    key: '/etc/ssl/private/server.key'
  },

  // Clustering
  cluster: {
    enabled: true,
    workers: require('os').cpus().length
  },

  // Security
  security: {
    helmet: true,  // Security headers
    csrf: true,    // CSRF protection
    rateLimit: {
      max: 100,
      windowMs: 60000
    }
  },

  // Performance
  cache: {
    enabled: true,
    ttl: 300,  // 5 minutes
    maxSize: 1000
  },

  // Monitoring
  metrics: {
    enabled: true,
    port: 9090
  },

  // Graceful shutdown
  shutdown: {
    timeout: 30000,  // 30s to finish requests
    signal: 'SIGTERM'
  }
};

await db.server.start(productionServer);
```

## Best Practices

### 1. Security Headers
```typescript
await db.server.configure({
  security: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'"
    }
  }
});
```

### 2. Request Validation
```typescript
// Validate request body
await db.server.configure({
  validation: {
    maxBodySize: '10mb',
    schemas: {
      '/collections/:name/search': {
        query: { type: 'array', items: { type: 'number' } },
        k: { type: 'number', minimum: 1, maximum: 1000 }
      }
    }
  }
});
```

### 3. Response Caching
```typescript
// Cache search results
await db.server.configure({
  cache: {
    enabled: true,
    ttl: 300,  // 5 minutes
    keyGenerator: (req) => `${req.path}:${JSON.stringify(req.body)}`
  }
});
```

### 4. Load Balancing
```nginx
# Nginx configuration
upstream ruvector {
    least_conn;
    server localhost:8081;
    server localhost:8082;
    server localhost:8083;
}

server {
    listen 80;
    location / {
        proxy_pass http://ruvector;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Troubleshooting

### CORS Errors
- Check origin configuration
- Verify preflight response
- Review allowed methods
- Check credentials setting

### Rate Limit Issues
- Review limit configuration
- Check key generation
- Monitor abuse patterns
- Implement backoff strategy

### High Latency
- Enable compression
- Implement caching
- Use connection pooling
- Optimize query patterns

### Memory Leaks
- Monitor connection count
- Enable request timeout
- Implement keep-alive
- Review event listeners

## Related Skills
- `metrics` - Server metrics
- `storage` - API persistence
- `cluster-management` - Distributed server
- `benchmarking` - API performance
