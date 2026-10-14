//
// Copyright 2026 DXOS.org
//

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { type PreviewServer, preview } from 'vite';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { Shell } from '#shell';

import { ComputerShellPlugin } from './computer-shell-plugin.ts';

describe('ComputerShellPlugin', () => {
  let root: string;
  let server: PreviewServer;

  beforeAll(async () => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'dx-computer-preview-')));
    server = await preview({
      root,
      configFile: false,
      logLevel: 'silent',
      build: { outDir: root },
      preview: { port: 0, host: '127.0.0.1' },
      plugins: [ComputerShellPlugin({ root })],
    });
  });

  afterAll(async () => {
    await server.close();
    fs.rmSync(root, { recursive: true, force: true });
  });

  test('mounts the shell route in vite preview', async ({ expect }) => {
    const origin = server.resolvedUrls?.local[0];
    expect(origin).toBeDefined();
    const response = await fetch(new URL(Shell.PATH, origin), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ script: 'pwd' }),
    });
    expect(response.status).toBe(200);
    const result: Shell.Result = await response.json();
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe(root);
  });
});
