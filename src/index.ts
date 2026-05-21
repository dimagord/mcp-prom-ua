#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import { PromApiClient } from './services/PromApiClient.js';
import { registerOrderTools } from './tools/orders.js';
import { registerProductTools } from './tools/products.js';
import { registerMessageTools } from './tools/messages.js';

function createServer(): { server: McpServer; getClient: () => PromApiClient } {
  const token = process.env.PROM_API_TOKEN;

  if (!token) {
    process.stderr.write(
      'Error: PROM_API_TOKEN environment variable is required.\n' +
      'Get your token from: my.prom.ua → Settings → API Tokens\n'
    );
    process.exit(1);
  }

  const apiClient = new PromApiClient(token);
  const getClient = () => apiClient;

  const server = new McpServer({
    name: 'prom-ua-mcp-server',
    version: '1.0.0',
  });

  // Register all tool domains
  registerOrderTools(server, getClient);
  registerProductTools(server, getClient);
  registerMessageTools(server, getClient);

  return { server, getClient };
}

async function runStdio(): Promise<void> {
  const { server } = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write('Prom.ua MCP server running via stdio\n');
}

async function runHTTP(): Promise<void> {
  const { server } = createServer();
  const app = express();
  app.use(express.json());

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', server: 'prom-ua-mcp-server', version: '1.0.0' });
  });

  app.post('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on('close', () => transport.close());
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  const port = parseInt(process.env.PORT || '3000', 10);
  app.listen(port, () => {
    process.stderr.write(`Prom.ua MCP server running on http://localhost:${port}/mcp\n`);
  });
}

const transport = process.env.TRANSPORT || 'stdio';
if (transport === 'http') {
  runHTTP().catch((error) => {
    process.stderr.write(`Server error: ${error}\n`);
    process.exit(1);
  });
} else {
  runStdio().catch((error) => {
    process.stderr.write(`Server error: ${error}\n`);
    process.exit(1);
  });
}
