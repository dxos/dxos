//
// Copyright 2026 DXOS.org
//

import { existsSync } from 'node:fs';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { type ViteDevServer, build, createServer } from 'vite';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { hotModulesPlugin } from '../hot-modules/index.ts';
import { manifestFileName, pluginConfigPlugin } from './index.ts';

const coreDir = path.resolve(import.meta.dirname, '../../core');
// Absolute, so the build-time evaluator loads the framework source without any alias.
const core = (file: string) => JSON.stringify(path.join(coreDir, file));

const KEY = 'org.dxos.plugin.manifest';

// A plugin with one browser module and one node module; a body is plain code, since only its location matters.
const files: Record<string, string> = {
  'index.html': '<!doctype html><html><body><script type="module" src="/main.ts"></script></body></html>',
  'main.ts': `import config from './dx.config.ts'; console.log(config.meta, config.make);`,
  'capabilities.ts': `
    import * as Capability from ${core('capability.ts')};
    export const Value = Capability.makeSingleton()('org.dxos.test.manifest.value');
  `,
  'dx.config.ts': `
    import * as Capability from ${core('capability.ts')};
    import * as Plugin from ${core('plugin.ts')};
    import { Value } from './capabilities.ts';
    export default Plugin.config({
      plugin: { key: '${KEY}', name: 'Manifest' },
      modules: [
        Capability.lazyModule('Value', { provides: [Value], environments: ['browser'] }, () =>
          import('./value.ts', { with: { type: 'module-url' } }),
        ),
        Capability.lazyModule('Server', { environments: ['node'] }, () =>
          import('./server.ts', { with: { type: 'module-url' } }),
        ),
      ],
    });
  `,
  'value.ts': `export default () => 'value';`,
  'server.ts': `export default () => 'server';`,
};

const writeFixture = async (prefix: string) => {
  const dir = await mkdtemp(path.join(tmpdir(), prefix));
  await Promise.all(Object.entries(files).map(([file, content]) => writeFile(path.join(dir, file), content)));
  return dir;
};

const listFiles = async (dir: string): Promise<string[]> =>
  (await readdir(dir, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)));

describe('pluginConfigPlugin', { timeout: 60_000 }, () => {
  describe('app build', () => {
    let dir: string;
    let outDir: string;

    beforeAll(async () => {
      dir = await writeFixture('plugin-config-build-');
      outDir = path.join(dir, 'out');
      await build({
        root: dir,
        configFile: false,
        logLevel: 'error',
        plugins: [pluginConfigPlugin()],
        build: {
          outDir,
          minify: false,
          // The generated module imports the framework by package name; only its URLs are under test.
          rolldownOptions: { external: (id) => id.startsWith('@dxos/') },
        },
      });
    });

    afterAll(async () => {
      if (dir !== undefined) {
        await rm(dir, { recursive: true, force: true });
      }
    });

    test('emits the manifest as JSON listing hashed chunks relative to it', async ({ expect }) => {
      const fileName = manifestFileName(KEY);
      expect(fileName).toBe(`plugins/${KEY}/manifest.json`);
      const manifest = JSON.parse(await readFile(path.join(outDir, fileName), 'utf8'));
      expect(manifest.plugin).toEqual({ key: KEY, name: 'Manifest' });
      // The node module is left out of a browser build.
      expect(manifest.modules.map(({ id }: { id: string }) => id)).toEqual(['Value']);
      const [{ url, provides }] = manifest.modules;
      expect(provides).toEqual([{ identifier: 'org.dxos.test.manifest.value', arity: 'single' }]);
      expect(url).toMatch(/^\.\.\/\.\.\/assets\/value-[\w-]+\.js$/);
      expect(existsSync(path.resolve(outDir, path.dirname(fileName), url))).toBe(true);
    });

    test('emits no JS module for the config and points the app at the manifest', async ({ expect }) => {
      const outputs = await listFiles(outDir);
      expect(outputs.filter((file) => file.includes('dx.config'))).toEqual([]);
      expect(outputs.some((file) => file.startsWith('assets/server-'))).toBe(false);
      const entries = await Promise.all(
        outputs
          .filter((file) => file.startsWith('assets/index-') && file.endsWith('.js'))
          .map((file) => readFile(path.join(outDir, file), 'utf8')),
      );
      const entry = entries.join('\n');
      expect(entry).toContain('fromManifestUrl');
      expect(entry).toContain(`plugins/${KEY}/manifest.json`);
    });
  });

  describe('dev server', () => {
    let dir: string;
    let server: ViteDevServer;
    let origin: string;

    beforeAll(async () => {
      dir = await writeFixture('plugin-config-dev-');
      server = await createServer({
        root: dir,
        configFile: false,
        logLevel: 'error',
        plugins: [pluginConfigPlugin(), hotModulesPlugin()],
        // The generated module imports the framework by its package name.
        resolve: { alias: { '@dxos/app-framework/Plugin': path.join(coreDir, 'plugin.ts') } },
        server: { port: 0, fs: { allow: [dir, coreDir] } },
      });
      await server.listen();
      const url = server.resolvedUrls?.local[0];
      if (url === undefined) {
        throw new Error('dev server has no local url');
      }
      origin = new URL(url).origin;
    });

    afterAll(async () => {
      await server?.close();
      if (dir !== undefined) {
        await rm(dir, { recursive: true, force: true });
      }
    });

    test('serves the config as metadata pointing at the manifest endpoint', async ({ expect }) => {
      const result = await server.environments.client.transformRequest('/dx.config.ts');
      expect(result?.code).toContain('fromManifestUrl');
      expect(result?.code).toContain(`/@dx-plugins/${KEY}/manifest.json`);
      expect(result?.code).not.toContain('value.ts');
    });

    test('serves the manifest as JSON with module bodies by file URL', async ({ expect }) => {
      await server.environments.client.transformRequest('/dx.config.ts');
      const response = await fetch(`${origin}/@dx-plugins/${KEY}/manifest.json`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('application/json');
      const manifest = await response.json();
      expect(manifest.modules).toMatchObject([{ id: 'Value', url: `/@fs${path.join(dir, 'value.ts')}` }]);
    });

    test('answers 404 for a plugin whose config was never loaded', async ({ expect }) => {
      const response = await fetch(`${origin}/@dx-plugins/org.dxos.plugin.unknown/manifest.json`);
      expect(response.status).toBe(404);
    });

    test('makes each listed body hot-replaceable', async ({ expect }) => {
      await server.environments.client.transformRequest('/dx.config.ts');
      const body = await server.environments.client.transformRequest(`/@fs${path.join(dir, 'value.ts')}`);
      expect(body?.code).toContain('__dxHotKey');
    });
  });
});
