/**
 * MCP Server Module for @ruvector/flow
 *
 * Model Context Protocol implementation with support for:
 * - 111+ tools across 14 categories
 * - STDIO and SSE transports
 * - Production-ready error handling
 * - Full TypeScript support
 *
 * @example
 * ```typescript
 * import { createMCPServer } from '@ruvector/flow/mcp';
 *
 * // Create STDIO server (default)
 * const server = await createMCPServer({
 *   name: '@ruvector/flow',
 *   version: '0.1.0',
 *   transport: 'stdio'
 * });
 *
 * // Create SSE server
 * const sseServer = await createMCPServer({
 *   transport: 'sse',
 *   port: 3000,
 *   host: 'localhost'
 * });
 *
 * // Register custom tool
 * server.registerTool('custom_tool', async (args) => {
 *   return { result: 'custom implementation' };
 * }, {
 *   name: 'custom_tool',
 *   description: 'Custom tool description',
 *   inputSchema: {
 *     type: 'object',
 *     properties: {
 *       param: { type: 'string' }
 *     }
 *   }
 * });
 *
 * // Get server status
 * console.log(server.getStatus());
 *
 * // Stop server
 * await server.stop();
 * ```
 *
 * @module mcp
 */

// Main server exports
export { MCPServer, createMCPServer } from './server.js';

// Transport exports
export { StdioTransport, createStdioTransport } from './stdio.js';
export { SSETransport, createSSETransport } from './sse.js';
export type { SSETransportOptions } from './sse.js';

// Tool registry exports
export { createToolRegistry, TOOL_CATEGORIES } from './tools/index.js';

// Type exports
export type {
  MCPRequest,
  MCPResponse,
  MCPError,
  MCPTool,
  MCPToolResult,
  MCPServerConfig,
  MCPServerOptions,
  MCPServerStatus,
  MCPTransport,
  MCPTransportOptions,
  MCPToolHandler,
  MCPToolRegistry,
  MCPToolEntry
} from './types.js';

export { MCP_PROTOCOL_VERSION, JSON_RPC_ERRORS } from './types.js';
