//
// Copyright 2026 DXOS.org
//

import fs from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { build } from 'vite';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { type IconAssets, iconAssetsPlugin } from './icon-assets.ts';

describe('iconAssetsPlugin', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(join(tmpdir(), 'icon-assets-test-'));
    fs.mkdirSync(join(root, 'catalog'));
    fs.writeFileSync(join(root, 'catalog', 'alpha.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    fs.writeFileSync(join(root, 'index.html'), '<!doctype html><html><body></body></html>');
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const runBuild = (assets: Partial<IconAssets>) =>
    build({
      configFile: false,
      root,
      logLevel: 'silent',
      plugins: [iconAssetsPlugin({ route: '/catalog', dir: join(root, 'catalog'), ...assets })],
    });

  test('copies the catalog into the build output', async () => {
    await runBuild({});
    expect(fs.existsSync(join(root, 'dist', 'catalog', 'alpha.svg'))).toBe(true);
  });

  test('leaves a dev-only catalog out of the build output', async () => {
    await runBuild({ copy: false });
    expect(fs.existsSync(join(root, 'dist', 'catalog'))).toBe(false);
  });
});
