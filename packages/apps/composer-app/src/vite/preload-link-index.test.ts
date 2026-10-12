//
// Copyright 2026 DXOS.org
//

import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'vite';
import { describe, test } from 'vitest';

import { preloadLinkIndex } from './preload-link-index.ts';

describe('preloadLinkIndex', () => {
  test('replaces the per-dependency link scan in the built preload helper', async ({ expect }) => {
    const root = mkdtempSync(path.join(tmpdir(), 'preload-link-index-'));
    try {
      mkdirSync(path.join(root, 'src'));
      writeFileSync(path.join(root, 'index.html'), '<script type="module" src="/src/main.js"></script>');
      writeFileSync(path.join(root, 'src/main.js'), "void import('./a.js').then(({ a }) => a());");
      writeFileSync(path.join(root, 'src/a.js'), "import { b } from './b.js';\nexport const a = () => b();");
      writeFileSync(path.join(root, 'src/b.js'), 'export const b = () => 1;');
      await build({
        root,
        logLevel: 'silent',
        configFile: false,
        plugins: [preloadLinkIndex()],
        build: { minify: false },
      });
      const assets = path.join(root, 'dist/assets');
      const code = readdirSync(assets)
        .filter((file) => file.endsWith('.js'))
        .map((file) => readFileSync(path.join(assets, file), 'utf8'))
        .join('\n');
      expect(code).toContain('documentLinks');
      expect(code).not.toMatch(/links\.length - 1/);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
