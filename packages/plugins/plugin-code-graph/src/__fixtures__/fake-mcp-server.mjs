//
// Copyright 2026 DXOS.org
//

// A stand-in for `code-index mcp` in tests: newline-delimited JSON-RPC on stdio, just enough MCP to exercise the
// middleware's success, text-only and tool-error paths.

import * as readline from 'node:readline';

const reply = (id, result) => process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  const message = JSON.parse(line);
  if (message.id === undefined) {
    return;
  }
  if (message.method === 'initialize') {
    reply(message.id, { protocolVersion: '2025-06-18', capabilities: {} });
    return;
  }
  const { name, arguments: args } = message.params;
  if (name === 'ask') {
    reply(message.id, { isError: true, content: [{ type: 'text', text: 'bad sparql' }] });
  } else if (name === 'files') {
    reply(message.id, { content: [{ type: 'text', text: JSON.stringify({ files: [], total: 0 }) }] });
  } else {
    reply(message.id, { content: [], structuredContent: { tool: name, args } });
  }
});
