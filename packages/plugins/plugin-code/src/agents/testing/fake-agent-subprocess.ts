//
// Copyright 2026 DXOS.org
//

import * as acp from '@agentclientprotocol/sdk';

import { makeFakeAgent } from './fake-agent.ts';

// The fake agent as a process speaking ACP on stdio, for the helper's tests to launch.
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

const connection = makeFakeAgent().connect(acp.ndJsonStream(output, input));
await connection.closed;
