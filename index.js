#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import path from 'path';

// Import all tools and handlers from centralized index
import { tools, handlers } from './src/tools/index.js';

// Server configuration
const server = new Server(
  {
    name: 'hillnote-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Register handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (!handlers[name]) {
    throw new McpError(ErrorCode.MethodNotFound, `Tool ${name} not found`);
  }
  
  try {
    const result = await handlers[name](args || {});
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    throw new McpError(ErrorCode.InternalError, error.message);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Only log in development mode to avoid polluting stdio in production
  if (process.env.NODE_ENV === 'development') {
    console.error('Hillnote MCP server started');
    console.error(`Available tools: ${tools.length}`);
    console.error('Tools:', tools.map(t => t.name).join(', '));
  }
}

main().catch((error) => {
  // Only log errors in development to avoid stdio pollution
  if (process.env.NODE_ENV === 'development') {
    console.error('Server error:', error);
  }
  process.exit(1);
});