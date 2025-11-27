/**
 * STDIO Transport for MCP Server
 *
 * Implements JSON-RPC 2.0 over stdin/stdout
 * Uses line-delimited JSON for message framing
 *
 * @module mcp/stdio
 */

import { EventEmitter } from 'node:events';
import { createInterface, Interface } from 'node:readline';
import type { MCPRequest, MCPResponse, MCPTransport, MCPTransportOptions } from './types.js';

/**
 * STDIO transport implementation
 *
 * Reads JSON-RPC requests from stdin
 * Writes JSON-RPC responses to stdout
 * Writes logs to stderr
 */
export class StdioTransport extends EventEmitter implements MCPTransport {
  private readline: Interface | null = null;
  private running = false;
  private debug: boolean;

  /**
   * Create STDIO transport
   *
   * @param options - Transport options
   */
  constructor(options: MCPTransportOptions = {}) {
    super();
    this.debug = options.debug ?? false;
  }

  /**
   * Start the transport
   *
   * Initializes readline interface and begins reading from stdin
   */
  async start(): Promise<void> {
    if (this.running) {
      throw new Error('STDIO transport already running');
    }

    try {
      // Create readline interface
      this.readline = createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
      });

      // Handle incoming lines
      this.readline.on('line', this.handleLine.bind(this));

      // Handle readline close
      this.readline.on('close', () => {
        this.log('STDIO transport closed');
        this.emit('close');
      });

      // Handle stdin errors
      process.stdin.on('error', (error) => {
        this.log(`STDIN error: ${error.message}`);
        this.emit('error', error);
      });

      this.running = true;
      this.log('STDIO transport started');
    } catch (error) {
      this.log(`Failed to start STDIO transport: ${error}`);
      throw error;
    }
  }

  /**
   * Stop the transport
   *
   * Closes the readline interface
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      if (this.readline) {
        this.readline.close();
        this.readline = null;
      }

      this.running = false;
      this.log('STDIO transport stopped');
    } catch (error) {
      this.log(`Error stopping STDIO transport: ${error}`);
      throw error;
    }
  }

  /**
   * Send response to stdout
   *
   * @param response - JSON-RPC response
   */
  async sendResponse(response: MCPResponse): Promise<void> {
    if (!this.running) {
      throw new Error('Transport not running');
    }

    try {
      const json = JSON.stringify(response);
      process.stdout.write(json + '\n');

      this.log(`Sent response: ${response.id}`);
    } catch (error) {
      this.log(`Failed to send response: ${error}`);
      throw error;
    }
  }

  /**
   * Handle incoming line from stdin
   *
   * @param line - JSON string
   */
  private handleLine(line: string): void {
    // Skip empty lines
    if (!line.trim()) {
      return;
    }

    try {
      const request = JSON.parse(line) as MCPRequest;

      // Validate JSON-RPC 2.0 format
      if (request.jsonrpc !== '2.0') {
        this.log(`Invalid JSON-RPC version: ${request.jsonrpc}`);
        return;
      }

      if (!request.method) {
        this.log('Missing method in request');
        return;
      }

      this.log(`Received request: ${request.method} (id: ${request.id})`);
      this.emit('request', request);
    } catch (error) {
      this.log(`Failed to parse request: ${error}`);

      // Send error response for invalid JSON
      const errorResponse: MCPResponse = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32700,
          message: 'Parse error'
        }
      };

      void this.sendResponse(errorResponse);
    }
  }

  /**
   * Log to stderr
   *
   * @param message - Log message
   */
  private log(message: string): void {
    if (!this.debug) return;

    const timestamp = new Date().toISOString();
    process.stderr.write(`[${timestamp}] [STDIO] ${message}\n`);
  }

  /**
   * Check if transport is running
   */
  isRunning(): boolean {
    return this.running;
  }
}

/**
 * Create and start STDIO transport
 *
 * @param options - Transport options
 * @returns Running transport instance
 */
export async function createStdioTransport(options?: MCPTransportOptions): Promise<StdioTransport> {
  const transport = new StdioTransport(options);
  await transport.start();
  return transport;
}
