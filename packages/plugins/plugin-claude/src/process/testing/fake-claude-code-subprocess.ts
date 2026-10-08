//
// Copyright 2026 DXOS.org
//

import * as acp from '@agentclientprotocol/sdk';
import { spawn } from 'node:child_process';

// Stands in for the Claude Code ACP adapter on stdio: each prompt is answered with its own text and
// the agent's pid and working directory, which is what a test needs to tell where and in which
// process a turn ran.
const input = new ReadableStream<Uint8Array>({
  start: (controller) => {
    process.stdin.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
    process.stdin.on('end', () => controller.close());
  },
});
const output = new WritableStream<Uint8Array>({
  write: (chunk) => {
    process.stdout.write(chunk);
  },
});

// As a tool Claude Code started would: a process that shares the agent's stdout and outlives it.
const holder = process.env.FAKE_AGENT_HOLD_STDOUT
  ? spawn('sleep', ['300'], { stdio: ['ignore', 'inherit', 'ignore'], detached: true })
  : undefined;
holder?.unref();

let sessions = 0;
const connection = acp
  .agent({ name: 'fake-claude-code' })
  .onRequest(acp.methods.agent.initialize, () => ({
    protocolVersion: acp.PROTOCOL_VERSION,
    agentCapabilities: { loadSession: false },
  }))
  .onRequest(acp.methods.agent.session.new, () => ({ sessionId: `fake-${++sessions}` }))
  .onRequest(acp.methods.agent.session.prompt, async ({ params, client }) => {
    const text = params.prompt.flatMap((block) => (block.type === 'text' ? [block.text] : [])).join('');
    await client.notify(acp.methods.client.session.update, {
      sessionId: params.sessionId,
      update: {
        sessionUpdate: 'agent_message_chunk',
        content: {
          type: 'text',
          text: `${text} pid=${process.pid} oauth=${process.env.CLAUDE_CODE_OAUTH_TOKEN ?? 'none'} cwd=${process.cwd()}${holder ? ` holder=${holder.pid}` : ''}`,
        },
      },
    });
    return { stopReason: 'end_turn' };
  })
  .connect(acp.ndJsonStream(output, input));
await connection.closed;
