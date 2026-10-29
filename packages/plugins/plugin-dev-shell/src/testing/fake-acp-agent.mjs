//
// Copyright 2026 DXOS.org
//

// A real agent process speaking ACP (newline-delimited JSON-RPC on stdio) for `agent-host.test.ts`. It has no
// dependencies, so it runs from the temporary agents directory the test copies it into: it opens one session and
// answers every prompt with a streamed echo, as Claude Code would.

import { createInterface } from 'node:readline';
const send = (message) => process.stdout.write(JSON.stringify({ jsonrpc: '2.0', ...message }) + '\n');
createInterface({ input: process.stdin }).on('line', (line) => {
  const { id, method, params } = JSON.parse(line);
  switch (method) {
    case 'initialize':
      return send({ id, result: { protocolVersion: params.protocolVersion, agentCapabilities: {} } });
    case 'session/new':
      return send({ id, result: { sessionId: 'dev-shell-1' } });
    case 'session/prompt': {
      const text = params.prompt
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('');
      for (const chunk of ['echo: ', text]) {
        send({
          method: 'session/update',
          params: {
            sessionId: params.sessionId,
            update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: chunk } },
          },
        });
      }
      return send({ id, result: { stopReason: 'end_turn' } });
    }
    default:
      return id === undefined
        ? undefined
        : send({ id, error: { code: -32601, message: 'method not found: ' + method } });
  }
});
