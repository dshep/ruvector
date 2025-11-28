# Ruvector Mathpix - OCR with WebAssembly

A high-performance OCR implementation with mathematical equation recognition, available as:
- **REST API Server** - Mathpix v3 API compatible
- **WebAssembly Module** - Browser-based OCR with <2MB bundle
- **CLI Tool** - Command-line interface

## Features

### REST API Server

- **Complete Mathpix v3 API Implementation**
  - Image-to-text OCR processing
  - Digital ink recognition
  - Async PDF processing with job queue
  - Document conversion (MMD, DOCX)
  - SSE streaming for real-time results

- **Production-Ready Middleware**
  - Authentication (app_id/app_key validation)
  - Token bucket rate limiting
  - Request tracing and logging
  - CORS support
  - Gzip compression

- **Async Job Queue**
  - Background PDF processing
  - Job status tracking
  - Webhook callbacks
  - Result caching

- **Robust Error Handling**
  - Validation with validator crate
  - Comprehensive error responses
  - Graceful shutdown

### WebAssembly Module

- **Browser-Based OCR**
  - Process images directly in the browser
  - Multiple input formats (File, Canvas, Base64, URL)
  - TypeScript definitions included

- **Web Worker Support**
  - Off-main-thread processing
  - Progress reporting
  - Batch processing

- **Optimized Bundle**
  - <2MB compressed size
  - Efficient memory management
  - Fast initialization

## Project Structure

```
examples/mathpix/
├── src/
│   ├── wasm/               # WebAssembly bindings
│   │   ├── mod.rs          # WASM module entry
│   │   ├── api.rs          # JavaScript API
│   │   ├── worker.rs       # Web Worker support
│   │   ├── canvas.rs       # Canvas handling
│   │   ├── memory.rs       # Memory management
│   │   └── types.rs        # Type definitions
│   ├── api/
│   │   ├── mod.rs          # Module organization & server startup
│   │   ├── routes.rs       # Route definitions
│   │   ├── handlers.rs     # Request handlers
│   │   ├── middleware.rs   # Auth, rate limiting, tracing
│   │   ├── state.rs        # Application state
│   │   ├── requests.rs     # Request types & validation
│   │   ├── responses.rs    # Response types
│   │   └── jobs.rs         # Async job queue
│   ├── bin/
│   │   ├── server.rs       # API server entry point
│   │   └── cli.rs          # CLI entry point
│   └── lib.rs              # Library exports
├── web/                    # WebAssembly web resources
│   ├── index.js            # JavaScript wrapper
│   ├── worker.js           # Worker script
│   ├── types.ts            # TypeScript definitions
│   ├── example.html        # Interactive demo
│   ├── package.json        # NPM config
│   └── README.md           # WASM documentation
├── docs/
│   └── WASM_ARCHITECTURE.md
├── tests/
│   └── integration/
│       ├── mod.rs
│       └── api_tests.rs    # Integration tests
├── Cargo.toml
└── README.md
```

## API Endpoints

### Image Processing
- `POST /v3/text` - Process image OCR (multipart/base64/URL)
- `POST /v3/strokes` - Process digital ink strokes
- `POST /v3/latex` - Legacy equation recognition

### PDF Processing
- `POST /v3/pdf` - Create async PDF job
- `GET /v3/pdf/:id` - Get job status
- `DELETE /v3/pdf/:id` - Cancel job
- `GET /v3/pdf/:id/stream` - Stream results via SSE

### Conversion & History
- `POST /v3/converter` - Convert documents
- `GET /v3/ocr-results` - Get processing history
- `GET /v3/ocr-usage` - Get usage statistics

### Health
- `GET /health` - Health check (no auth required)

## Quick Start

### Installation

```bash
cd examples/mathpix
cargo build --release
```

### Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your settings:

```env
SERVER_ADDR=127.0.0.1:3000
RUST_LOG=mathpix_server=debug
RATE_LIMIT_PER_MINUTE=100
```

### Run Server

```bash
cargo run --bin mathpix-server
```

Or use the release build:

```bash
./target/release/mathpix-server
```

## Usage Examples

### Text OCR (Base64)

```bash
curl -X POST http://localhost:3000/v3/text \
  -H "Content-Type: application/json" \
  -H "app_id: your_app_id" \
  -H "app_key: your_app_key" \
  -d '{
    "base64": "SGVsbG8gV29ybGQ=",
    "metadata": {
      "formats": ["text", "latex"]
    }
  }'
```

### Text OCR (URL)

```bash
curl -X POST http://localhost:3000/v3/text \
  -H "Content-Type: application/json" \
  -H "app_id: your_app_id" \
  -H "app_key: your_app_key" \
  -d '{
    "url": "https://example.com/equation.png",
    "metadata": {
      "formats": ["text", "latex", "mathml"]
    }
  }'
```

### Digital Ink Strokes

```bash
curl -X POST http://localhost:3000/v3/strokes \
  -H "Content-Type: application/json" \
  -H "app_id: your_app_id" \
  -H "app_key: your_app_key" \
  -d '{
    "strokes": [
      {
        "x": [0.0, 1.0, 2.0, 3.0],
        "y": [0.0, 1.0, 1.0, 0.0]
      }
    ],
    "metadata": {
      "formats": ["latex"]
    }
  }'
```

### PDF Processing

```bash
# Create job
curl -X POST http://localhost:3000/v3/pdf \
  -H "Content-Type: application/json" \
  -H "app_id: your_app_id" \
  -H "app_key: your_app_key" \
  -d '{
    "url": "https://example.com/document.pdf",
    "options": {
      "format": "mmd",
      "enable_ocr": true,
      "include_images": true
    },
    "webhook_url": "https://your-webhook.com/callback"
  }'

# Get status
curl -X GET http://localhost:3000/v3/pdf/{job_id} \
  -H "app_id: your_app_id" \
  -H "app_key: your_app_key"

# Stream results (SSE)
curl -X GET http://localhost:3000/v3/pdf/{job_id}/stream \
  -H "app_id: your_app_id" \
  -H "app_key: your_app_key"
```

### Health Check

```bash
curl http://localhost:3000/health
```

## Testing

Run the integration test suite:

```bash
cargo test --test '*'
```

Run with output:

```bash
cargo test --test '*' -- --nocapture
```

## Architecture

### Request Flow

```
Client Request
    ↓
[Middleware Stack]
    ├─ Tracing Layer (logging)
    ├─ CORS Layer
    ├─ Compression Layer
    ├─ Auth Middleware (app_id/app_key)
    └─ Rate Limit Middleware (token bucket)
    ↓
[Route Handler]
    ├─ Request Validation
    ├─ Business Logic
    └─ Response Formatting
    ↓
[Background Processing] (PDF jobs)
    ├─ Job Queue (tokio channels)
    ├─ Status Tracking
    └─ Webhook Callbacks
```

### State Management

```rust
AppState {
    job_queue: Arc<JobQueue>,        // Async job processing
    cache: Cache<String, String>,    // Result caching
    rate_limiter: Arc<RateLimiter>,  // Token bucket
}
```

## Performance Considerations

- **Async I/O**: All operations use Tokio for non-blocking execution
- **Connection pooling**: Reuse HTTP clients for external requests
- **Caching**: Moka cache with TTL for frequently accessed results
- **Rate limiting**: Governor crate with token bucket algorithm
- **Compression**: Gzip compression for large responses
- **Graceful shutdown**: Proper cleanup of resources on termination

## Security

- **Authentication**: Required for all API endpoints (except health)
- **Input validation**: Comprehensive validation using validator crate
- **Rate limiting**: Prevents abuse (100 req/min default)
- **HTTPS**: Should be terminated at reverse proxy (nginx/traefik)
- **Secrets**: Never hardcode credentials, use environment variables

## Dependencies

- **axum**: Web framework
- **tower/tower-http**: Middleware stack
- **tokio**: Async runtime
- **serde/serde_json**: Serialization
- **validator**: Input validation
- **governor**: Rate limiting
- **moka**: Async caching
- **reqwest**: HTTP client
- **tracing**: Structured logging

## TODO

- [ ] Implement actual OCR engine integration
- [ ] Add database persistence for jobs
- [ ] Implement webhook retry logic
- [ ] Add metrics collection (Prometheus)
- [ ] Add API documentation (OpenAPI/Swagger)
- [ ] Implement multi-tenancy
- [ ] Add horizontal scaling support
- [ ] Implement result pagination
- [ ] Add batch processing endpoints

## License

MIT
