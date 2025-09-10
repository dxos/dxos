import { describe, it } from '@effect/vitest';
import { Config, Effect } from 'effect';
import { TestHelpers } from '@dxos/effect';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

// Linear MCP server uses OAuth 2.1 authentication
const LINEAR_MCP_SERVER = 'https://mcp.linear.app/mcp';

// TODO(dmaretskyi): Get this from the OAuth flow.
const LINEAR_MCP_API_KEY = '<redacted>';

describe('MCP', () => {
  it.runIf(TestHelpers.tagEnabled('llm'))('linear auth', async () => {
    // Note: Linear MCP server requires OAuth 2.1 authentication with dynamic client registration.
    // This test demonstrates the connection attempt, but will fail without proper OAuth flow.
    // In production, use mcp-remote or implement OAuth flow.

    const client = new Client({
      name: 'dxos-mcp-client',
      version: '1.0.0',
    });

    // TODO: Implement OAuth authentication flow for Linear MCP
    // For now, this will fail with 401 Unauthorized
    const transport = new StreamableHTTPClientTransport(new URL(LINEAR_MCP_SERVER), {
      requestInit: {
        headers: {
          Authorization: `Bearer ${LINEAR_MCP_API_KEY}`,
        },
      },
    });

    await client.connect(transport);

    // This code would work after proper OAuth authentication:
    const tools = await client.listTools();
    console.log(
      'Available tools:',
      tools.tools.map((t) => t.name),
    );
  });
});
