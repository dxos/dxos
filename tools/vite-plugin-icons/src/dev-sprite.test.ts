//
// Copyright 2026 DXOS.org
//

import fs from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { type ViteDevServer, createServer } from 'vite';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { IconsPlugin } from './index.ts';
import { iconSymbolPattern } from './symbol-pattern.ts';

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10H0z"/></svg>';

describe('dev sprite', () => {
  let root: string;
  const servers: ViteDevServer[] = [];

  beforeEach(() => {
    // Real path: Vite resolves module ids through symlinks (macOS `/var` → `/private/var`), and the
    // content globs must match those ids.
    root = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'icons-test-')));
    fs.mkdirSync(join(root, 'src'));
    fs.mkdirSync(join(root, 'assets'));
    fs.mkdirSync(join(root, 'public'));
    for (const name of ['alpha', 'beta']) {
      fs.writeFileSync(join(root, 'assets', `${name}.svg`), SVG);
      fs.writeFileSync(join(root, 'src', `${name}.ts`), `export const icon = 'ph--${name}--regular';\n`);
    }
  });

  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => server.close()));
    fs.rmSync(root, { recursive: true, force: true });
  });

  const startServer = async () => {
    const server = await createServer({
      configFile: false,
      root,
      publicDir: join(root, 'public'),
      logLevel: 'silent',
      server: { port: 0, strictPort: false, ws: false, watch: null },
      plugins: [
        IconsPlugin({
          symbolPattern: iconSymbolPattern({ sets: ['ph'] }),
          assetPath: (_iconSet, name) => join(root, 'assets', `${name}.svg`),
          contentPaths: [join(root, 'src/**/*.ts')],
          spriteFile: 'icons.svg',
        }),
      ],
    });
    servers.push(server);
    await server.listen();
    const url = server.resolvedUrls?.local[0];
    if (!url) {
      throw new Error('Dev server has no local URL.');
    }

    return {
      load: (module: string) => server.transformRequest(`/src/${module}.ts`),
      sprite: async () => {
        const response = await fetch(new URL('icons.svg', url));
        expect(response.status).toBe(200);
        return response.text();
      },
    };
  };

  test('serves the symbols found in the modules it transformed', async () => {
    const server = await startServer();
    await server.load('alpha');
    expect(await server.sprite()).toContain('id="ph--alpha--regular"');
  });

  test('a second server sharing the public dir cannot replace the sprite the first one serves', async () => {
    // The shared storybook and every storybook vitest run load the same config, and so the same publicDir.
    const shared = await startServer();
    await shared.load('alpha');
    expect(await shared.sprite()).toContain('id="ph--alpha--regular"');

    const testRun = await startServer();
    await testRun.load('beta');
    const testRunSprite = await testRun.sprite();
    expect(testRunSprite).toContain('id="ph--beta--regular"');
    expect(testRunSprite).not.toContain('id="ph--alpha--regular"');

    expect(await shared.sprite()).toContain('id="ph--alpha--regular"');
    expect(fs.existsSync(join(root, 'public', 'icons.svg'))).toBe(false);
  });

  test('removes a sprite left in the public dir, which a static server would serve ahead of its own', async () => {
    fs.writeFileSync(join(root, 'public', 'icons.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    await startServer();
    expect(fs.existsSync(join(root, 'public', 'icons.svg'))).toBe(false);
  });
});
