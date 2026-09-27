//
// Copyright 2026 DXOS.org
//

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { describe, expect, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as HttpBackend from '../services/HttpBackend.ts';
import { canRunLocalSandboxes } from '../testing/probe.ts';
import { runSidecar } from './sidecar.ts';

const unavailable = !(await canRunLocalSandboxes());

const TOKEN = 'a'.repeat(64);

const readLine = (stream: PassThrough): Promise<string> =>
  new Promise((resolve) => stream.once('data', (chunk: Buffer) => resolve(chunk.toString('utf8'))));

describe.skipIf(unavailable)('local sandbox sidecar', { timeout: 60_000 }, () => {
  test('serves sandboxes on the port it reports until its input closes', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dx-sandbox-sidecar-'));
    const input = new PassThrough();
    const output = new PassThrough();
    const running = runSidecar({ input, output, env: { PATH: process.env.PATH, DX_SANDBOX_ROOT: root } });
    input.write(`${TOKEN}\n`);

    const { port } = JSON.parse(await readLine(output));
    const backend = HttpBackend.make(`http://127.0.0.1:${port}`, TOKEN);
    const result = await EffectEx.runPromise(backend.exec('space', 'sbx', { command: 'echo "$WORKSPACE"' }));
    expect(result.stdout).toBe(`${join(root, 'sbx', 'workspace')}\n`);

    input.end();
    await running;
    await expect(fetch(`http://127.0.0.1:${port}/exec`, { method: 'POST' })).rejects.toThrow();
    await rm(root, { recursive: true, force: true });
  });

  test('refuses a short token', async () => {
    const input = new PassThrough();
    const running = runSidecar({ input, output: new PassThrough(), env: {} });
    input.end('short\n');
    await expect(running).rejects.toThrow(/token/);
  });
});
