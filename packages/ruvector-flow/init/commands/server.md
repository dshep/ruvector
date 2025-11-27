# REST API Server Commands

HTTP server management, CORS configuration, compression, and rate limiting.

## Commands

### /server start

Start the REST API server.

**Syntax:**
```bash
/server start [options]
```

**Arguments:**
- `--host <host>` - Bind host (default: 0.0.0.0)
- `--port <port>` - Bind port (default: 6333)
- `--tls` - Enable TLS/HTTPS
- `--cert <path>` - TLS certificate path
- `--key <path>` - TLS private key path
- `--workers <n>` - Number of worker threads (default: auto)

**Example:**
```bash
/server start
/server start --host 127.0.0.1 --port 8080
/server start --tls --cert /etc/certs/server.crt --key /etc/certs/server.key
/server start --workers 16 --port 6333
```

**Returns:**
```json
{
  "status": "running",
  "host": "0.0.0.0",
  "port": 6333,
  "tls_enabled": false,
  "workers": 8,
  "pid": 12345,
  "endpoints": [
    "http://0.0.0.0:6333/collections",
    "http://0.0.0.0:6333/collections/{collection}/points",
    "http://0.0.0.0:6333/collections/{collection}/points/search",
    "http://0.0.0.0:6333/metrics",
    "http://0.0.0.0:6333/health"
  ]
}
```

---

### /server stop

Stop the REST API server gracefully.

**Syntax:**
```bash
/server stop [options]
```

**Arguments:**
- `--timeout <seconds>` - Graceful shutdown timeout (default: 30)
- `--force` - Force shutdown (skip graceful period)

**Example:**
```bash
/server stop
/server stop --timeout 60
/server stop --force
```

**Returns:**
```json
{
  "status": "stopped",
  "graceful": true,
  "active_connections_closed": 15,
  "shutdown_duration_ms": 2345
}
```

---

### /server status

Get server status and statistics.

**Syntax:**
```bash
/server status
```

**Example:**
```bash
/server status
```

**Returns:**
```json
{
  "status": "running",
  "uptime_seconds": 86400,
  "version": "0.1.0",
  "host": "0.0.0.0",
  "port": 6333,
  "tls_enabled": false,
  "workers": 8,
  "connections": {
    "active": 25,
    "total": 10000,
    "rate_per_second": 15.5
  },
  "requests": {
    "total": 500000,
    "rate_per_second": 850.3,
    "by_method": {
      "GET": 300000,
      "POST": 180000,
      "PUT": 15000,
      "DELETE": 5000
    },
    "by_status": {
      "200": 490000,
      "400": 8000,
      "404": 1500,
      "500": 500
    }
  },
  "latency": {
    "p50_ms": 2.5,
    "p95_ms": 15.3,
    "p99_ms": 45.2
  }
}
```

---

### /server cors

Configure Cross-Origin Resource Sharing (CORS).

**Syntax:**
```bash
/server cors [options]
```

**Arguments:**
- `--enable` - Enable CORS
- `--disable` - Disable CORS
- `--origins <origins>` - Allowed origins (comma-separated, default: *)
- `--methods <methods>` - Allowed methods (default: GET,POST,PUT,DELETE,OPTIONS)
- `--headers <headers>` - Allowed headers (default: *)
- `--credentials` - Allow credentials (cookies, auth)
- `--max-age <seconds>` - Preflight cache duration (default: 3600)

**Example:**
```bash
/server cors --enable
/server cors --enable --origins "https://app.example.com,https://admin.example.com"
/server cors --enable --origins "*" --methods "GET,POST" --credentials
/server cors --enable --headers "Content-Type,Authorization" --max-age 7200
/server cors --disable
```

**Returns:**
```json
{
  "cors_enabled": true,
  "allowed_origins": ["https://app.example.com", "https://admin.example.com"],
  "allowed_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  "allowed_headers": ["*"],
  "allow_credentials": true,
  "max_age_seconds": 3600
}
```

---

### /server compression

Configure response compression.

**Syntax:**
```bash
/server compression [options]
```

**Arguments:**
- `--enable` - Enable compression
- `--disable` - Disable compression
- `--algorithms <algos>` - Compression algorithms: gzip, br, deflate (comma-separated)
- `--level <level>` - Compression level 1-9 (default: 6)
- `--min-size <bytes>` - Minimum response size to compress (default: 1024)

**Example:**
```bash
/server compression --enable
/server compression --enable --algorithms "gzip,br" --level 9
/server compression --enable --min-size 2048 --level 4
/server compression --disable
```

**Returns:**
```json
{
  "compression_enabled": true,
  "algorithms": ["gzip", "br"],
  "level": 6,
  "min_size_bytes": 1024,
  "stats": {
    "total_responses": 100000,
    "compressed_responses": 85000,
    "compression_ratio": 3.5,
    "bytes_saved": 524288000
  }
}
```

---

### /server rate-limit

Configure rate limiting.

**Syntax:**
```bash
/server rate-limit [options]
```

**Arguments:**
- `--enable` - Enable rate limiting
- `--disable` - Disable rate limiting
- `--requests <n>` - Max requests per window
- `--window <duration>` - Time window (e.g., 1m, 1h)
- `--by <key>` - Rate limit by: ip, user, api-key (default: ip)
- `--burst <n>` - Burst allowance (default: requests × 2)

**Example:**
```bash
/server rate-limit --enable --requests 1000 --window 1m
/server rate-limit --enable --requests 10000 --window 1h --by api-key
/server rate-limit --enable --requests 100 --window 1m --burst 150
/server rate-limit --disable
```

**Returns:**
```json
{
  "rate_limit_enabled": true,
  "max_requests": 1000,
  "window": "1m",
  "limit_by": "ip",
  "burst": 2000,
  "stats": {
    "total_requests": 50000,
    "limited_requests": 250,
    "limit_rate_percent": 0.5
  }
}
```

---

## API Endpoints

### Collections
```
GET    /collections                          # List collections
POST   /collections                          # Create collection
GET    /collections/{collection}             # Get collection info
DELETE /collections/{collection}             # Delete collection
```

### Points (Vectors)
```
GET    /collections/{collection}/points                    # List points
POST   /collections/{collection}/points                    # Insert points
PUT    /collections/{collection}/points                    # Update points
POST   /collections/{collection}/points/delete             # Delete points
POST   /collections/{collection}/points/search             # Search points
POST   /collections/{collection}/points/scroll             # Scroll points
```

### Indexes
```
GET    /collections/{collection}/indexes                   # List indexes
POST   /collections/{collection}/indexes                   # Create index
DELETE /collections/{collection}/indexes/{index}           # Delete index
POST   /collections/{collection}/indexes/{index}/build     # Build index
```

### Cluster
```
GET    /cluster/status                       # Cluster status
GET    /cluster/nodes                        # List nodes
POST   /cluster/nodes                        # Add node
DELETE /cluster/nodes/{node}                 # Remove node
```

### Health & Metrics
```
GET    /health                               # Health check
GET    /ready                                # Readiness check
GET    /live                                 # Liveness check
GET    /metrics                              # Prometheus metrics
```

---

## TLS/HTTPS Configuration

### Generate Self-Signed Certificate
```bash
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout server.key \
  -out server.crt \
  -days 365 \
  -subj "/CN=localhost"
```

### Start with TLS
```bash
/server start --tls --cert server.crt --key server.key
```

### Let's Encrypt (Production)
```bash
# Use certbot to obtain certificates
certbot certonly --standalone -d api.example.com

# Start with Let's Encrypt certs
/server start --tls \
  --cert /etc/letsencrypt/live/api.example.com/fullchain.pem \
  --key /etc/letsencrypt/live/api.example.com/privkey.pem
```

---

## CORS Configuration

### Development (Allow All)
```bash
/server cors --enable --origins "*" --credentials
```

### Production (Specific Origins)
```bash
/server cors --enable \
  --origins "https://app.example.com,https://admin.example.com" \
  --methods "GET,POST,PUT,DELETE" \
  --headers "Content-Type,Authorization" \
  --credentials \
  --max-age 3600
```

### Disable CORS
```bash
/server cors --disable
```

---

## Compression

### Optimal Settings
```bash
# Balance between speed and compression
/server compression --enable --algorithms "gzip,br" --level 6

# Maximum compression (slower)
/server compression --enable --algorithms "br" --level 9

# Fast compression
/server compression --enable --algorithms "gzip" --level 1
```

### Compression Algorithms
- **gzip**: Good balance, widely supported
- **br (Brotli)**: Better compression, modern browsers
- **deflate**: Legacy support

### Compression Ratios
- **Text/JSON**: 3-5x compression
- **Already compressed** (images, video): Minimal benefit
- **Vectors**: 2-3x compression with quantization

---

## Rate Limiting

### By IP Address
```bash
# 1000 requests per minute per IP
/server rate-limit --enable --requests 1000 --window 1m --by ip
```

### By API Key
```bash
# 10000 requests per hour per API key
/server rate-limit --enable --requests 10000 --window 1h --by api-key
```

### Custom Burst
```bash
# Allow bursts up to 150% of limit
/server rate-limit --enable --requests 100 --window 1m --burst 150
```

### Rate Limit Headers
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 750
X-RateLimit-Reset: 1674216000
```

---

## Performance Tuning

### Worker Threads
```bash
# Auto-detect (recommended)
/server start

# Manual configuration
/server start --workers 16  # 2x CPU cores
```

### Connection Limits
```bash
# Configure max connections
/server configure --max-connections 10000
```

### Timeouts
```bash
# Request timeout
/server configure --request-timeout 30s

# Keep-alive timeout
/server configure --keepalive-timeout 60s
```

---

## Monitoring

### Access Logs
```json
{
  "timestamp": "2024-01-20T10:30:45.123Z",
  "method": "POST",
  "path": "/collections/products/points/search",
  "status": 200,
  "duration_ms": 12.5,
  "ip": "192.168.1.100",
  "user_agent": "Mozilla/5.0..."
}
```

### Error Logs
```json
{
  "timestamp": "2024-01-20T10:30:45.123Z",
  "level": "error",
  "message": "Collection not found",
  "collection": "invalid-collection",
  "request_id": "req-abc123"
}
```

---

## Load Balancing

### Nginx Configuration
```nginx
upstream ruvector {
    least_conn;
    server 192.168.1.10:6333;
    server 192.168.1.11:6333;
    server 192.168.1.12:6333;
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

### HAProxy Configuration
```
backend ruvector
    balance roundrobin
    option httpchk GET /health
    server node1 192.168.1.10:6333 check
    server node2 192.168.1.11:6333 check
    server node3 192.168.1.12:6333 check
```

---

## Security Best Practices

1. **Always use TLS in production**
2. **Configure CORS restrictively**
3. **Enable rate limiting**
4. **Use API keys for authentication**
5. **Monitor access logs**
6. **Keep server updated**
7. **Use firewall rules**
8. **Implement request validation**

---

## Common Options

- `--format <format>` - Output format: json, table (default: json)
- `--verbose, -v` - Verbose output
- `--help, -h` - Show command help

## Notes

- Server starts in background by default
- Graceful shutdown waits for active requests
- TLS requires valid certificate and key
- CORS is disabled by default for security
- Compression is automatic based on Accept-Encoding
- Rate limiting uses token bucket algorithm
- Worker count defaults to CPU core count
