//
// Copyright 2026 DXOS.org
//

import { closeSync, openSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'vitest';

import * as McpClient from './McpClient.ts';

const FAKE_SERVER = fileURLToPath(new URL('../__fixtures__/fake-mcp-server.mjs', import.meta.url));

/** macOS's `posix_spawn` refuses file descriptors at or above `OPEN_MAX`, which libuv uses for stdio pipes. */
const OPEN_MAX = 10_240;

/** Opens descriptors until one is numbered past `OPEN_MAX`, as a dev server watching a large tree does. */
const fillDescriptorTable = (): number[] | undefined => {
  const fds: number[] = [];
  try {
    while ((fds.at(-1) ?? 0) <= OPEN_MAX + 16) {
      fds.push(openSync('/dev/null', 'r'));
    }
    return fds;
  } catch {
    fds.forEach((fd) => closeSync(fd));
    return undefined;
  }
};

describe.runIf(process.platform === 'darwin')('McpClient', () => {
  test('starts the server on first use after the process has opened many files', async ({ expect, skip }) => {
    const client = McpClient.make({ command: process.execPath, args: [FAKE_SERVER], cwd: process.cwd() });
    const fds = fillDescriptorTable();
    if (!fds) {
      client.close();
      skip('RLIMIT_NOFILE is too low to open past OPEN_MAX');
      return;
    }
    try {
      expect(await client.callTool('query', { sparql: 'SELECT * {}' })).toEqual({
        tool: 'query',
        args: { sparql: 'SELECT * {}' },
      });
    } finally {
      client.close();
      fds.forEach((fd) => closeSync(fd));
    }
  });
});
