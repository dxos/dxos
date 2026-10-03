//
// A chess engine exposed as an MCP server on one Cloudflare Worker.
//
// Built as the demo for plugin-debug's "Chess MCP on Workers" space template: this is the artifact
// stages two through four of that plan produce, so Composer has something real to call.
//
// Streamable HTTP on POST /mcp — no SSE, no session header, no state between requests. Every
// request carries the position as FEN, which is what lets the Worker be evicted freely.
//

import { evaluateFen, search } from './engine.js';

const PROTOCOL_VERSION = '2025-06-18';

const TOOLS = [
  {
    name: 'best_move',
    description:
      'Search for the best move from a chess position. Returns the move in SAN, a centipawn score from White’s point of view, the depth reached, the number of nodes searched, and whether the node budget truncated the search.',
    inputSchema: {
      type: 'object',
      properties: {
        fen: { type: 'string', description: 'Position in Forsyth-Edwards Notation.' },
        depth: { type: 'integer', minimum: 1, maximum: 3, description: 'Search depth in plies (default 2).' },
      },
      required: ['fen'],
    },
  },
  {
    name: 'evaluate_position',
    description:
      'Statically evaluate a chess position without searching. Returns a centipawn score from White’s point of view, the side to move, the legal-move count, and whether the side to move is in check.',
    inputSchema: {
      type: 'object',
      properties: { fen: { type: 'string', description: 'Position in Forsyth-Edwards Notation.' } },
      required: ['fen'],
    },
  },
];

/** JSON-RPC error, as an MCP transport-level failure. */
const rpcError = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

/**
 * Tool result. `isError` reports a failure the MODEL should see and correct — an unparseable FEN is
 * the model's mistake to fix, not a transport fault, so it must not become a JSON-RPC error.
 */
const toolResult = (id, value, isError = false) => ({
  jsonrpc: '2.0',
  id,
  result: { content: [{ type: 'text', text: JSON.stringify(value, null, 2) }], isError },
});

const callTool = (id, name, args) => {
  const fen = args?.fen;
  if (typeof fen !== 'string' || fen.trim() === '') {
    return toolResult(id, { error: 'A `fen` string is required.' }, true);
  }

  try {
    switch (name) {
      case 'best_move': {
        // Depth is clamped rather than rejected: a model that asks for depth 8 wants the best
        // answer available, and failing the call teaches it nothing the clamp does not.
        const depth = Math.min(Math.max(Number(args.depth ?? 2) || 2, 1), 3);
        return toolResult(id, search({ fen, depth }));
      }
      case 'evaluate_position':
        return toolResult(id, evaluateFen(fen));
      default:
        return rpcError(id, -32601, `Unknown tool: ${name}`);
    }
  } catch (error) {
    // chess.js throws on an invalid FEN; that is the model's input to fix.
    return toolResult(id, { error: `Could not read the position: ${error.message}` }, true);
  }
};

const handleRpc = (message) => {
  if (message === null || typeof message !== 'object' || Array.isArray(message)) {
    return rpcError(null, -32600, 'Invalid Request');
  }

  const { id, method, params } = message;
  switch (method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: { name: 'chess-mcp', version: '0.1.0' },
        },
      };
    case 'tools/list':
      return { jsonrpc: '2.0', id, result: { tools: TOOLS } };
    case 'tools/call':
      return callTool(id, params?.name, params?.arguments);
    case 'ping':
      return { jsonrpc: '2.0', id, result: {} };
    default:
      // A notification (no id) gets no response at all, per JSON-RPC.
      return id === undefined ? null : rpcError(id, -32601, `Unknown method: ${method}`);
  }
};

// Permissive CORS: the callers are browser-based MCP clients on origins this Worker cannot enumerate,
// and every request is a stateless position query carrying no credential worth protecting.
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, accept, mcp-protocol-version, mcp-session-id, authorization',
};

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...CORS } });

export default {
  async fetch(request) {
    const { pathname } = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (pathname === '/' || pathname === '/health') {
      return new Response(`chess-mcp: alive\nPOST /mcp for the MCP endpoint (${TOOLS.length} tools)\n`, {
        headers: { 'content-type': 'text/plain', ...CORS },
      });
    }

    if (pathname !== '/mcp') {
      return json({ error: 'Not found. The MCP endpoint is POST /mcp.' }, 404);
    }

    // GET /mcp is how a Streamable HTTP client opens a server-initiated stream. This server never
    // initiates anything, so refusing it is correct and clients treat it as "no stream available".
    if (request.method === 'GET') {
      return json({ error: 'This server does not offer a server-initiated stream.' }, 405);
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed.' }, 405);
    }

    let message;
    try {
      message = await request.json();
    } catch {
      return json(rpcError(null, -32700, 'Parse error'), 400);
    }

    // A batch is a JSON array; each member is answered independently and notifications drop out.
    if (Array.isArray(message)) {
      // An EMPTY batch is itself an invalid request, distinct from a batch of notifications — which
      // legitimately produces no responses and so answers 202.
      if (message.length === 0) {
        return json(rpcError(null, -32600, 'Invalid Request'), 400);
      }
      const responses = message.map(handleRpc).filter((response) => response !== null);
      return responses.length === 0 ? new Response(null, { status: 202, headers: CORS }) : json(responses);
    }

    const response = handleRpc(message);
    return response === null ? new Response(null, { status: 202, headers: CORS }) : json(response);
  },
};
