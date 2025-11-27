/**
 * MCP Server for @ruvector/flow
 *
 * Implements Model Context Protocol (MCP) server with support for:
 * - 111+ tools across 14 categories
 * - STDIO and SSE transports
 * - Tool registration and execution
 * - Error handling and logging
 *
 * @module mcp/server
 */

import { EventEmitter } from 'node:events';
import type {
  MCPRequest,
  MCPResponse,
  MCPError,
  MCPTool,
  MCPToolResult,
  MCPServerConfig,
  MCPServerOptions,
  MCPTransport,
  MCPToolHandler,
  MCPToolRegistry
} from './types.js';
import { StdioTransport } from './stdio.js';
import { SSETransport } from './sse.js';
import { createToolRegistry } from './tools/index.js';

/**
 * MCP Server implementation
 *
 * Handles JSON-RPC 2.0 requests over STDIO or SSE transports
 * Manages tool registration and execution
 */
export class MCPServer extends EventEmitter {
  private transport: MCPTransport | null = null;
  private toolRegistry: MCPToolRegistry;
  private config: MCPServerConfig;
  private running = false;
  private requestId = 0;

  /**
   * Create a new MCP server instance
   *
   * @param options - Server configuration options
   */
  constructor(options: MCPServerOptions = {}) {
    super();

    this.config = {
      name: options.name ?? '@ruvector/flow',
      version: options.version ?? '0.1.0',
      description: options.description ?? 'Ruvector MCP Server',
      transport: options.transport ?? 'stdio',
      logging: options.logging ?? true,
      debug: options.debug ?? false,
      ...options
    };

    // Initialize tool registry with all 111+ tools
    this.toolRegistry = createToolRegistry();

    this.log('info', `MCP Server initialized: ${this.config.name} v${this.config.version}`);
  }

  /**
   * Start the MCP server
   *
   * Initializes the transport and begins listening for requests
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('Server is already running');
    }

    try {
      // Initialize transport
      this.transport = this.createTransport();

      // Set up transport event handlers
      this.transport.on('request', this.handleRequest.bind(this));
      this.transport.on('error', this.handleTransportError.bind(this));
      this.transport.on('close', this.handleTransportClose.bind(this));

      // Start transport
      await this.transport.start();

      this.running = true;
      this.emit('start');
      this.log('info', `MCP Server started with ${this.config.transport} transport`);
      this.log('info', `Registered ${this.toolRegistry.size} tools`);
    } catch (error) {
      this.log('error', `Failed to start server: ${error}`);
      throw error;
    }
  }

  /**
   * Stop the MCP server
   *
   * Closes the transport and cleans up resources
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      if (this.transport) {
        await this.transport.stop();
        this.transport = null;
      }

      this.running = false;
      this.emit('stop');
      this.log('info', 'MCP Server stopped');
    } catch (error) {
      this.log('error', `Error stopping server: ${error}`);
      throw error;
    }
  }

  /**
   * Register a custom tool
   *
   * @param name - Tool name
   * @param handler - Tool handler function
   * @param schema - Tool JSON schema
   */
  registerTool(name: string, handler: MCPToolHandler, schema: MCPTool): void {
    if (this.toolRegistry.has(name)) {
      throw new Error(`Tool '${name}' is already registered`);
    }

    this.toolRegistry.set(name, { handler, schema });
    this.log('debug', `Registered custom tool: ${name}`);
  }

  /**
   * Unregister a tool
   *
   * @param name - Tool name to unregister
   */
  unregisterTool(name: string): boolean {
    const removed = this.toolRegistry.delete(name);
    if (removed) {
      this.log('debug', `Unregistered tool: ${name}`);
    }
    return removed;
  }

  /**
   * Get list of registered tools
   *
   * @returns Array of tool schemas
   */
  listTools(): MCPTool[] {
    return Array.from(this.toolRegistry.values()).map(({ schema }) => schema);
  }

  /**
   * Get server status
   *
   * @returns Server status object
   */
  getStatus() {
    return {
      running: this.running,
      transport: this.config.transport,
      toolCount: this.toolRegistry.size,
      version: this.config.version,
      uptime: this.running ? process.uptime() : 0
    };
  }

  /**
   * Create transport based on configuration
   */
  private createTransport(): MCPTransport {
    switch (this.config.transport) {
      case 'stdio':
        return new StdioTransport({
          debug: this.config.debug
        });

      case 'sse':
        return new SSETransport({
          port: this.config.port ?? 3000,
          host: this.config.host ?? 'localhost',
          debug: this.config.debug
        });

      default:
        throw new Error(`Unknown transport: ${this.config.transport}`);
    }
  }

  /**
   * Handle incoming MCP request
   *
   * @param request - JSON-RPC 2.0 request
   */
  private async handleRequest(request: MCPRequest): Promise<void> {
    this.log('debug', `Received request: ${request.method}`);

    try {
      let response: MCPResponse;

      switch (request.method) {
        case 'initialize':
          response = await this.handleInitialize(request);
          break;

        case 'tools/list':
          response = await this.handleListTools(request);
          break;

        case 'tools/call':
          response = await this.handleCallTool(request);
          break;

        case 'ping':
          response = this.handlePing(request);
          break;

        default:
          response = this.createErrorResponse(
            request.id,
            -32601,
            `Method not found: ${request.method}`
          );
      }

      await this.transport?.sendResponse(response);
    } catch (error) {
      this.log('error', `Request handling error: ${error}`);

      const errorResponse = this.createErrorResponse(
        request.id,
        -32603,
        `Internal error: ${error instanceof Error ? error.message : String(error)}`
      );

      await this.transport?.sendResponse(errorResponse);
    }
  }

  /**
   * Handle initialize request
   */
  private async handleInitialize(request: MCPRequest): Promise<MCPResponse> {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        protocolVersion: '2024-11-05',
        serverInfo: {
          name: this.config.name,
          version: this.config.version,
          description: this.config.description
        },
        capabilities: {
          tools: {
            listChanged: false
          }
        }
      }
    };
  }

  /**
   * Handle tools/list request
   */
  private async handleListTools(request: MCPRequest): Promise<MCPResponse> {
    const tools = this.listTools();

    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        tools
      }
    };
  }

  /**
   * Handle tools/call request
   */
  private async handleCallTool(request: MCPRequest): Promise<MCPResponse> {
    const { name, arguments: args } = request.params ?? {};

    if (!name) {
      return this.createErrorResponse(
        request.id,
        -32602,
        'Missing tool name'
      );
    }

    const tool = this.toolRegistry.get(name);

    if (!tool) {
      return this.createErrorResponse(
        request.id,
        -32602,
        `Unknown tool: ${name}`
      );
    }

    try {
      this.log('debug', `Executing tool: ${name}`);
      const result = await tool.handler(args ?? {});

      return {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        }
      };
    } catch (error) {
      this.log('error', `Tool execution error (${name}): ${error}`);

      return this.createErrorResponse(
        request.id,
        -32603,
        `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Handle ping request
   */
  private handlePing(request: MCPRequest): MCPResponse {
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: {
        status: 'ok',
        timestamp: Date.now()
      }
    };
  }

  /**
   * Create error response
   */
  private createErrorResponse(
    id: string | number | null,
    code: number,
    message: string
  ): MCPResponse {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code,
        message
      }
    };
  }

  /**
   * Handle transport errors
   */
  private handleTransportError(error: Error): void {
    this.log('error', `Transport error: ${error.message}`);
    this.emit('error', error);
  }

  /**
   * Handle transport close
   */
  private handleTransportClose(): void {
    this.log('info', 'Transport closed');
    this.running = false;
    this.emit('close');
  }

  /**
   * Log message
   */
  private log(level: 'info' | 'error' | 'debug', message: string): void {
    if (!this.config.logging) return;
    if (level === 'debug' && !this.config.debug) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    if (level === 'error') {
      console.error(`${prefix} ${message}`);
    } else {
      console.log(`${prefix} ${message}`);
    }

    this.emit('log', { level, message, timestamp });
  }
}

/**
 * Create and start MCP server
 *
 * @param options - Server options
 * @returns Running MCP server instance
 */
export async function createMCPServer(options?: MCPServerOptions): Promise<MCPServer> {
  const server = new MCPServer(options);
  await server.start();
  return server;
}

/**
 * Export types
 */
export type {
  MCPRequest,
  MCPResponse,
  MCPError,
  MCPTool,
  MCPToolResult,
  MCPServerConfig,
  MCPServerOptions,
  MCPTransport,
  MCPToolHandler,
  MCPToolRegistry
};
