/**
 * TypeScript type definitions for MCP Server
 *
 * Implements Model Context Protocol types and interfaces
 *
 * @module mcp/types
 */

import type { EventEmitter } from 'node:events';

/**
 * JSON-RPC 2.0 request
 */
export interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

/**
 * JSON-RPC 2.0 response
 */
export interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: MCPError;
}

/**
 * JSON-RPC 2.0 error
 */
export interface MCPError {
  code: number;
  message: string;
  data?: unknown;
}

/**
 * MCP tool schema (JSON Schema)
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * MCP tool result
 */
export interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

/**
 * Tool handler function
 */
export type MCPToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

/**
 * Tool registry entry
 */
export interface MCPToolEntry {
  schema: MCPTool;
  handler: MCPToolHandler;
}

/**
 * Tool registry map
 */
export type MCPToolRegistry = Map<string, MCPToolEntry>;

/**
 * MCP transport interface
 */
export interface MCPTransport extends EventEmitter {
  start(): Promise<void>;
  stop(): Promise<void>;
  sendResponse(response: MCPResponse): Promise<void>;
  isRunning(): boolean;
}

/**
 * Transport options
 */
export interface MCPTransportOptions {
  debug?: boolean;
  port?: number;
  host?: string;
}

/**
 * Server configuration
 */
export interface MCPServerConfig {
  name: string;
  version: string;
  description: string;
  transport: 'stdio' | 'sse' | 'http';
  logging: boolean;
  debug: boolean;
  port?: number;
  host?: string;
}

/**
 * Server initialization options
 */
export interface MCPServerOptions {
  name?: string;
  version?: string;
  description?: string;
  transport?: 'stdio' | 'sse' | 'http';
  logging?: boolean;
  debug?: boolean;
  port?: number;
  host?: string;
}

/**
 * Server status
 */
export interface MCPServerStatus {
  running: boolean;
  transport: string;
  toolCount: number;
  version: string;
  uptime: number;
}

/**
 * MCP protocol version
 */
export const MCP_PROTOCOL_VERSION = '2024-11-05';

/**
 * Standard JSON-RPC error codes
 */
export const JSON_RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603
} as const;
