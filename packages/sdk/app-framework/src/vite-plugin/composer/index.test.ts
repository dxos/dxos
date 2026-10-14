//
// Copyright 2026 DXOS.org
//

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'vite';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { composerPlugin } from './index.ts';

describe('composerPlugin', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'dx-composer-plugin-'));
    mkdirSync(join(root, 'src'));
    writeFileSync(
      join(root, 'dx.config.mjs'),
      `export default { plugin: { key: 'org.example.plugin.hello', name: 'Hello' } };\n`,
    );
    writeFileSync(join(root, 'src', 'plugin.ts'), `export default 'hello';\n`);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  // `vite build <dir>` roots the project at <dir> while the process cwd stays elsewhere.
  test('reads dx.config from the Vite root rather than the process cwd', async ({ expect }) => {
    await build({
      root,
      configFile: false,
      logLevel: 'silent',
      plugins: composerPlugin({ entry: 'src/plugin.ts' }),
    });

    const manifest = JSON.parse(readFileSync(join(root, 'dist', 'manifest.json'), 'utf8'));
    expect(manifest.key).toBe('org.example.plugin.hello');
    expect(manifest.assets).toContain('index.mjs');
  });
});
