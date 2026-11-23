//
// Copyright 2026 DXOS.org
//

import { existsSync } from 'node:fs';
import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { type Browser, type Page, chromium } from 'playwright';
import { type ViteDevServer, createServer, defaultClientConditions, searchForWorkspaceRoot } from 'vite';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { hotModulesPlugin } from '../hot-modules/index.ts';
import { pluginConfigPlugin } from './index.ts';

// The cloud sandbox ships its own Chromium build rather than the one this Playwright version pins.
const executablePath = process.env.CLAUDE_CODE_REMOTE ? '/opt/pw-browsers/chromium' : undefined;
// Drives a real browser, which only exists where Playwright's Chromium has been installed.
const hasBrowser = existsSync(executablePath ?? chromium.executablePath());

const packageRoot = path.resolve(import.meta.dirname, '../../..');
const coreDir = path.join(packageRoot, 'src/core');
const workspaceRoot = searchForWorkspaceRoot(packageRoot);

// Absolute, so the build-time evaluator (which has none of the dev server's aliases) and the app load
// the same framework source.
const core = (file: string) => JSON.stringify(path.join(coreDir, file));

// A plugin defined by a `dx.config.ts`, served as a manifest whose module bodies load by URL.
const files: Record<string, string> = {
  'index.html': '<!doctype html><html><body><script type="module" src="/main.ts"></script></body></html>',
  'capabilities.ts': `
    import * as Capability from ${core('capability.ts')};
    export const Value = Capability.makeSingleton()('org.dxos.test.hot.value');
    export const Extra = Capability.makeSingleton()('org.dxos.test.hot.extra');
  `,
  'extra.ts': `
    import * as Effect from 'effect/Effect';
    import * as Capability from ${core('capability.ts')};
    import { Extra } from './capabilities.ts';
    export default Capability.makeModule(() => Effect.succeed([Capability.contribute(Extra, { extra: 'added' })]));
  `,
  'main.ts': `
    import * as Effect from 'effect/Effect';
    import * as PluginManager from ${core('plugin-manager/index.ts')};
    import { ActivationEvents } from '#common/index.ts';
    import { Extra, Value } from './capabilities.ts';
    import config from './dx.config.ts';

    window.__hot = { runs: [], loads: (window.__hot?.loads ?? 0) + 1 };
    const manager = PluginManager.make({
      plugins: [config.make()],
      enabled: [config.meta.profile.key],
      pluginLoader: (id) => Effect.fail(new Error(id)),
    });
    Object.defineProperty(window.__hot, 'value', { get: () => manager.capabilities.getAll(Value)[0]?.value });
    Object.defineProperty(window.__hot, 'extra', { get: () => manager.capabilities.getAll(Extra)[0]?.extra });
    await Effect.runPromise(Effect.andThen(manager.start(), manager.activate(ActivationEvents.Idle)));
  `,
};

/** The plugin's config; the plugin-level test adds a module to it. */
const pluginConfig = (options: { extra?: boolean } = {}) => `
  import * as Capability from ${core('capability.ts')};
  import * as Plugin from ${core('plugin.ts')};
  import { Extra, Value } from './capabilities.ts';
  export default Plugin.config({
    plugin: { key: 'org.dxos.plugin.hot', name: 'Hot' },
    modules: [
      Capability.lazyModule('Value', { provides: [Value] }, () =>
        import('./value.ts', { with: { type: 'module-url' } }),
      ),
      ${
        options.extra
          ? `Capability.lazyModule('Extra', { provides: [Extra] }, () =>
               import('./extra.ts', { with: { type: 'module-url' } }),
             ),`
          : ''
      }
    ],
  });
`;

const valueBody = (version: string) => `
  import * as Effect from 'effect/Effect';
  import * as Capability from ${core('capability.ts')};
  import { Value } from './capabilities.ts';
  export default Capability.makeModule(() =>
    Effect.sync(() => {
      window.__hot.runs.push('value ${version}');
      return [Capability.contribute(Value, { value: '${version}' })];
    }),
  );
`;

describe.skipIf(!hasBrowser)('hot module replacement of a dx.config.ts plugin', { timeout: 120_000 }, () => {
  let dir: string;
  let server: ViteDevServer;
  let browser: Browser;
  let page: Page;

  const write = (file: string, content: string) => writeFile(path.join(dir, file), content);
  const waitForValue = (expected: string) =>
    page.waitForFunction(`window.__hot?.value === ${JSON.stringify(expected)}`, undefined, { timeout: 30_000 });

  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'plugin-config-hot-'));
    // Bare imports in the fixture resolve through the package's own dependencies.
    await symlink(path.join(packageRoot, 'node_modules'), path.join(dir, 'node_modules'));
    await Promise.all([
      ...Object.entries(files).map(([file, content]) => write(file, content)),
      write('value.ts', valueBody('v1')),
      write('dx.config.ts', pluginConfig()),
    ]);

    server = await createServer({
      root: dir,
      configFile: false,
      logLevel: 'error',
      plugins: [pluginConfigPlugin(), hotModulesPlugin()],
      resolve: {
        alias: [
          // The manifest module the config is served as imports the framework by its package name.
          { find: /^@dxos\/app-framework\/Plugin$/, replacement: path.join(coreDir, 'plugin.ts') },
          { find: /^#common/, replacement: path.join(packageRoot, 'src/common') },
          // Shared `@dxos/*` code imports `node:util`; resolved the way Composer resolves it.
          {
            find: /^(node:)?util$/,
            replacement: path.join(workspaceRoot, 'packages/common/node-std/dist/lib/util.mjs'),
          },
        ],
        conditions: ['source', ...defaultClientConditions],
      },
      server: { port: 0, fs: { allow: [dir, workspaceRoot] } },
    });
    await server.listen();
    browser = await chromium.launch({ executablePath });
    page = await browser.newPage();
    page.on('pageerror', (error) => console.error('[page]', error));
    const url = server.resolvedUrls?.local[0];
    if (url === undefined) {
      throw new Error('dev server has no local url');
    }
    await page.goto(url);
    await waitForValue('v1');
  }, 120_000);

  afterAll(async () => {
    await browser?.close();
    await server?.close();
    if (dir !== undefined) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('re-runs an edited module body without reloading the page', async ({ expect }) => {
    await write('value.ts', valueBody('v2'));
    await waitForValue('v2');
    expect(await page.evaluate('window.__hot.loads')).toBe(1);
    expect(await page.evaluate('window.__hot.runs')).toEqual(['value v1', 'value v2']);
  });

  test('re-creates the plugin when its config changes', async ({ expect }) => {
    await write('dx.config.ts', pluginConfig({ extra: true }));
    await page.waitForFunction(`window.__hot?.extra === 'added'`, undefined, { timeout: 30_000 });
    expect(await page.evaluate('window.__hot.value')).toBe('v2');
    expect(await page.evaluate('window.__hot.loads')).toBe(1);
  });
});
