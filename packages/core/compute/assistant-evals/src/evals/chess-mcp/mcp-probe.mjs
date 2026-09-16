//
// Copyright 2026 DXOS.org
//

//
// The MCP client the chess eval runs inside the session's sandbox, under that sandbox's node.
// It is imported as text (`?raw`) and shipped over exec, so it has to stand alone: no imports, and
// nothing newer than the node the sandbox image carries.
//
// Streamable HTTP: one POST per call, the session header the transport may hand back, and either a
// JSON body or an SSE frame per response. Given a position and candidate URLs, it tries each until
// one answers `initialize`, lists that server's tools, calls the one that names a move and the one
// that evaluates, and prints one JSON report on the last line of stdout.
//

const [fen, ...candidates] = process.argv.slice(2);

const parse = async (response) => {
  const text = await response.text();
  if ((response.headers.get('content-type') ?? '').includes('text/event-stream')) {
    const frames = text
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim());
    const answer = frames.filter((frame) => frame.includes('"result"') || frame.includes('"error"')).pop();
    return JSON.parse(answer ?? frames.pop() ?? 'null');
  }
  return text ? JSON.parse(text) : null;
};

const headers = (session) => ({
  'content-type': 'application/json',
  'accept': 'application/json, text/event-stream',
  ...(session ? { 'mcp-session-id': session } : {}),
});

// A candidate that accepts the connection and then says nothing must not consume the whole probe:
// without this the loop never reaches the next URL and the exec times out with no report.
const CALL_TIMEOUT_MILLIS = 20_000;

const rpc = async (url, session, id, method, params) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: headers(session),
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
    signal: AbortSignal.timeout(CALL_TIMEOUT_MILLIS),
  });
  return {
    status: response.status,
    session: response.headers.get('mcp-session-id') ?? session,
    body: await parse(response),
  };
};

/** Arguments for a tool whose schema the eval did not write: the position where it fits, a small budget where one is required. */
const argsFor = (schema, fen) => {
  const properties = schema?.properties ?? {};
  const required = schema?.required ?? [];
  const args = {};
  for (const [key, property] of Object.entries(properties)) {
    if (/fen|position/i.test(key)) {
      args[key] = fen;
    } else if (required.includes(key) && /depth|ply/i.test(key)) {
      args[key] = 3;
    } else if (required.includes(key) && /node/i.test(key)) {
      args[key] = 20000;
    } else if (required.includes(key) && /ms|time|budget|millis/i.test(key)) {
      args[key] = 1000;
    } else if (required.includes(key) && property.type === 'string') {
      args[key] = fen;
    } else if (required.includes(key) && property.type === 'number') {
      args[key] = 3;
    }
  }
  return args;
};

const textOf = (result) => (result?.content ?? []).map((part) => part.text ?? JSON.stringify(part)).join('\n');

const call = async (url, session, id, tool) => {
  const response = await rpc(url, session, id, 'tools/call', {
    name: tool.name,
    arguments: argsFor(tool.inputSchema, fen),
  });
  return response.body?.result ? textOf(response.body.result) : JSON.stringify(response.body?.error ?? response.status);
};

const report = { endpoint: undefined, tools: [], bestMove: undefined, evaluation: undefined, errors: [] };
for (const url of candidates) {
  try {
    const init = await rpc(url, undefined, 1, 'initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'dxos-eval', version: '0' },
    });
    if (init.status >= 400 || !init.body?.result) {
      report.errors.push(`${url}: initialize ${init.status}`);
      continue;
    }
    await fetch(url, {
      method: 'POST',
      headers: headers(init.session),
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
      signal: AbortSignal.timeout(CALL_TIMEOUT_MILLIS),
    }).catch(() => undefined);

    const list = await rpc(url, init.session, 2, 'tools/list', {});
    const tools = list.body?.result?.tools ?? [];
    report.endpoint = url;
    report.tools = tools.map((tool) => tool.name);
    const mover = tools.find((tool) => /best|move/i.test(tool.name));
    const evaluator = tools.find((tool) => tool !== mover && /eval|score|analy/i.test(tool.name));
    if (mover) {
      report.bestMove = await call(url, init.session, 3, mover);
    }
    if (evaluator) {
      report.evaluation = await call(url, init.session, 4, evaluator);
    }
    break;
  } catch (error) {
    report.errors.push(`${url}: ${String(error)}`);
  }
}

console.log(JSON.stringify(report));
