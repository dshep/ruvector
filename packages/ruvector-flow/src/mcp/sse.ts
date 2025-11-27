/**
 * SSE Transport for MCP Server
 *
 * Implements Server-Sent Events (SSE) over HTTP
 * Provides bidirectional communication via SSE + POST
 *
 * @module mcp/sse
 */

import { EventEmitter } from 'node:events';
import { createServer, Server, IncomingMessage, ServerResponse } from 'node:http';
import type { MCPRequest, MCPResponse, MCPTransport, MCPTransportOptions } from './types.js';

/**
 * SSE transport configuration
 */
export interface SSETransportOptions extends MCPTransportOptions {
  /** HTTP server port (default: 3000) */
  port?: number;
  /** HTTP server host (default: localhost) */
  host?: string;
  /** CORS origin (default: *) */
  corsOrigin?: string;
  /** Max message size in bytes (default: 10MB) */
  maxMessageSize?: number;
}

/**
 * SSE transport implementation
 *
 * Server-Sent Events for server-to-client streaming
 * HTTP POST for client-to-server requests
 */
export class SSETransport extends EventEmitter implements MCPTransport {
  private server: Server | null = null;
  private clients: Map<string, ServerResponse> = new Map();
  private running = false;
  private port: number;
  private host: string;
  private corsOrigin: string;
  private maxMessageSize: number;
  private debug: boolean;
  private clientIdCounter = 0;

  /**
   * Create SSE transport
   *
   * @param options - Transport options
   */
  constructor(options: SSETransportOptions = {}) {
    super();

    this.port = options.port ?? 3000;
    this.host = options.host ?? 'localhost';
    this.corsOrigin = options.corsOrigin ?? '*';
    this.maxMessageSize = options.maxMessageSize ?? 10 * 1024 * 1024; // 10MB
    this.debug = options.debug ?? false;
  }

  /**
   * Start the transport
   *
   * Creates HTTP server and begins accepting connections
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('SSE transport already running');
    }

    return new Promise((resolve, reject) => {
      try {
        this.server = createServer(this.handleRequest.bind(this));

        this.server.on('error', (error) => {
          this.log(`Server error: ${error.message}`);
          this.emit('error', error);
        });

        this.server.listen(this.port, this.host, () => {
          this.running = true;
          this.log(`SSE transport started on ${this.host}:${this.port}`);
          resolve();
        });
      } catch (error) {
        this.log(`Failed to start SSE transport: ${error}`);
        reject(error);
      }
    });
  }

  /**
   * Stop the transport
   *
   * Closes all client connections and HTTP server
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        // Close all SSE connections
        for (const [clientId, res] of this.clients) {
          this.sendSSE(res, 'close', { message: 'Server shutting down' });
          res.end();
          this.clients.delete(clientId);
        }

        // Close HTTP server
        if (this.server) {
          this.server.close((error) => {
            if (error) {
              this.log(`Error closing server: ${error.message}`);
              reject(error);
            } else {
              this.running = false;
              this.log('SSE transport stopped');
              resolve();
            }
          });
        } else {
          resolve();
        }
      } catch (error) {
        this.log(`Error stopping SSE transport: ${error}`);
        reject(error);
      }
    });
  }

  /**
   * Send response via SSE to specific client
   *
   * @param response - JSON-RPC response
   */
  async sendResponse(response: MCPResponse): Promise<void> {
    if (!this.running) {
      throw new Error('Transport not running');
    }

    // Broadcast response to all connected clients
    // In production, should track which client made the request
    for (const [clientId, res] of this.clients) {
      this.sendSSE(res, 'response', response);
    }
  }

  /**
   * Handle HTTP request
   *
   * @param req - Incoming request
   * @param res - Server response
   */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', this.corsOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

    // Handle SSE connection
    if (req.method === 'GET' && url.pathname === '/sse') {
      this.handleSSEConnection(req, res);
      return;
    }

    // Handle RPC request
    if (req.method === 'POST' && url.pathname === '/rpc') {
      await this.handleRPCRequest(req, res);
      return;
    }

    // Handle health check
    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', clients: this.clients.size }));
      return;
    }

    // 404 for unknown routes
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }

  /**
   * Handle SSE connection
   *
   * @param req - Incoming request
   * @param res - Server response
   */
  private handleSSEConnection(req: IncomingMessage, res: ServerResponse): void {
    const clientId = `client-${++this.clientIdCounter}`;

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Store client
    this.clients.set(clientId, res);
    this.log(`Client connected: ${clientId} (total: ${this.clients.size})`);

    // Send initial connection message
    this.sendSSE(res, 'connect', { clientId });

    // Handle client disconnect
    req.on('close', () => {
      this.clients.delete(clientId);
      this.log(`Client disconnected: ${clientId} (total: ${this.clients.size})`);
    });
  }

  /**
   * Handle RPC request via POST
   *
   * @param req - Incoming request
   * @param res - Server response
   */
  private async handleRPCRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      // Read request body
      const body = await this.readBody(req);

      if (body.length > this.maxMessageSize) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Request too large' }));
        return;
      }

      const request = JSON.parse(body) as MCPRequest;

      // Validate JSON-RPC 2.0
      if (request.jsonrpc !== '2.0') {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON-RPC version' }));
        return;
      }

      if (!request.method) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing method' }));
        return;
      }

      this.log(`Received RPC request: ${request.method} (id: ${request.id})`);

      // Emit request for server to handle
      this.emit('request', request);

      // Send acknowledgment
      res.writeHead(202, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'accepted' }));
    } catch (error) {
      this.log(`RPC request error: ${error}`);

      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        error: 'Invalid request',
        message: error instanceof Error ? error.message : String(error)
      }));
    }
  }

  /**
   * Send SSE message
   *
   * @param res - Server response
   * @param event - Event name
   * @param data - Event data
   */
  private sendSSE(res: ServerResponse, event: string, data: unknown): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    res.write(message);
  }

  /**
   * Read request body
   *
   * @param req - Incoming request
   * @returns Request body as string
   */
  private async readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';

      req.on('data', (chunk) => {
        body += chunk.toString();

        if (body.length > this.maxMessageSize) {
          reject(new Error('Request too large'));
        }
      });

      req.on('end', () => {
        resolve(body);
      });

      req.on('error', reject);
    });
  }

  /**
   * Log message
   *
   * @param message - Log message
   */
  private log(message: string): void {
    if (!this.debug) return;

    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [SSE] ${message}`);
  }

  /**
   * Check if transport is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }
}

/**
 * Create and start SSE transport
 *
 * @param options - Transport options
 * @returns Running transport instance
 */
export async function createSSETransport(options?: SSETransportOptions): Promise<SSETransport> {
  const transport = new SSETransport(options);
  await transport.start();
  return transport;
}
