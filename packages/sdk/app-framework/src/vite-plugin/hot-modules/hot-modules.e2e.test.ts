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

import { hotModulesPlugin } from './index.ts';

// The cloud sandbox ships its own Chromium build rather than the one this Playwright version pins.
const executablePath = process.env.CLAUDE_CODE_REMOTE ? '/opt/pw-browsers/chromium' : undefined;
// Drives a real browser, which only exists where Playwright's Chromium has been installed.
const hasBrowser = existsSync(executablePath ?? chromium.executablePath());

const packageRoot = path.resolve(import.meta.dirname, '../../..');
const coreDir = path.join(packageRoot, 'src/core');
const workspaceRoot = searchForWorkspaceRoot(packageRoot);

// The fixture is a tiny app on the real framework: a lazy plugin whose definition lives in its own
// file, with a provider module (whose body imports a helper) and a consumer that requires the
// provider's singleton, so an edit must cascade.
const files: Record<string, string> = {
  'index.html': '<!doctype html><html><body><script type="module" src="/main.ts"></script></body></html>',
  'meta.ts': `
    import { DXN } from '@dxos/keys';
    import * as Plugin from '#core/plugin.ts';
    export const meta = Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.hot'), name: 'Hot' });
  `,
  'capabilities.ts': `
    import * as Capability from '#core/capability.ts';
    export const Value = Capability.makeSingleton()('org.dxos.test.hot.value');
    export const Derived = Capability.makeSingleton()('org.dxos.test.hot.derived');
    export const Extra = Capability.makeSingleton()('org.dxos.test.hot.extra');
    // Rebuilds the namespace, as app-toolkit's makers do; the update must still reach the body inside.
    const checked = (loader) => () => loader().then((module) => ({ ...module, default: module.default }));
    export const ValueModule = Capability.lazyModule('Value', { provides: [Value] }, checked(() => import('./value.ts')));
    export const DerivedModule = Capability.lazyModule(
      'Derived',
      { requires: [Value], provides: [Derived] },
      () => import('./derived.ts'),
    );
  `,
  'helper.ts': `export const suffix = 'h1';`,
  'derived.ts': `
    import * as Effect from 'effect/Effect';
    import * as Capability from '#core/capability.ts';
    import { Derived, Value } from './capabilities.ts';
    export default Capability.makeModule(() =>
      Effect.gen(function* () {
        const { value } = yield* Value;
        window.__hot.runs.push('derived ' + value);
        return [Capability.contribute(Derived, { derived: 'from ' + value })];
      }),
    );
  `,
  'main.ts': `
    import * as Effect from 'effect/Effect';
    import * as Plugin from '#core/plugin.ts';
    import * as PluginManager from '#core/plugin-manager/index.ts';
    import { ActivationEvents } from '#common/index.ts';
    import { Derived, Extra } from './capabilities.ts';
    import { meta } from './meta.ts';

    window.__hot = { runs: [], loads: (window.__hot?.loads ?? 0) + 1 };
    const HotPlugin = Plugin.lazy(meta, () => import('./plugin.ts'));
    const manager = PluginManager.make({
      plugins: [HotPlugin()],
      enabled: [meta.profile.key],
      pluginLoader: (id) => Effect.fail(new Error(id)),
    });
    Object.defineProperty(window.__hot, 'failed', { get: () => manager.getFailed().length > 0 });
    Object.defineProperty(window.__hot, 'derived', { get: () => manager.capabilities.getAll(Derived)[0]?.derived });
    Object.defineProperty(window.__hot, 'extra', { get: () => manager.capabilities.getAll(Extra)[0]?.extra });
    await Effect.runPromise(Effect.andThen(manager.start(), manager.activate(ActivationEvents.Idle)));
  `,
};

/** The plugin definition; the plugin-level test adds a module to it. */
const pluginDefinition = (options: { extra?: boolean } = {}) => `
  import * as Effect from 'effect/Effect';
  import * as Capability from '#core/capability.ts';
  import * as Plugin from '#core/plugin.ts';
  import { DerivedModule, Extra, ValueModule } from './capabilities.ts';
  import { meta } from './meta.ts';
  ${
    options.extra
      ? `const ExtraModule = Capability.inlineModule('Extra', { provides: [Extra] }, () =>
           Effect.succeed([Capability.contribute(Extra, { extra: 'added' })]),
         );`
      : ''
  }
  export default Plugin.make(
    Plugin.define(meta).pipe(
      Plugin.addModule(ValueModule),
      Plugin.addModule(DerivedModule),
      ${options.extra ? 'Plugin.addModule(ExtraModule),' : ''}
    ),
  );
`;

const valueBody = (version: string) => `
  import * as Effect from 'effect/Effect';
  import * as Capability from '#core/capability.ts';
  import { Value } from './capabilities.ts';
  import { suffix } from './helper.ts';
  export default Capability.makeModule(() =>
    Effect.gen(function* () {
      ${version === 'broken' ? "throw new Error('broken edit');" : ''}
      window.__hot.runs.push('value ${version}');
      yield* Effect.addFinalizer(() => Effect.sync(() => window.__hot.runs.push('stop ${version}')));
      return [Capability.contribute(Value, { value: '${version}-' + suffix })];
    }),
  );
`;

describe.skipIf(!hasBrowser)('hot module replacement', { timeout: 120_000 }, () => {
  let dir: string;
  let server: ViteDevServer;
  let browser: Browser;
  let page: Page;

  const write = (file: string, content: string) => writeFile(path.join(dir, file), content);
  const waitForDerived = (expected: string) =>
    page.waitForFunction(`window.__hot?.derived === ${JSON.stringify(expected)}`, undefined, { timeout: 30_000 });

  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'hot-modules-'));
    // Bare imports in the fixture resolve through the package's own dependencies.
    await symlink(path.join(packageRoot, 'node_modules'), path.join(dir, 'node_modules'));
    await Promise.all([
      ...Object.entries(files).map(([file, content]) => write(file, content)),
      write('value.ts', valueBody('v1')),
      write('plugin.ts', pluginDefinition()),
    ]);

    server = await createServer({
      root: dir,
      configFile: false,
      logLevel: 'error',
      plugins: [hotModulesPlugin()],
      resolve: {
        alias: [
          { find: /^#core/, replacement: coreDir },
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
    await waitForDerived('from v1-h1');
  }, 120_000);

  afterAll(async () => {
    await browser?.close();
    await server?.close();
    if (dir !== undefined) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('re-runs an edited module and its dependents without reloading the page', async ({ expect }) => {
    await write('value.ts', valueBody('v2'));
    await waitForDerived('from v2-h1');
    expect(await page.evaluate('window.__hot.loads')).toBe(1);
    expect(await page.evaluate('window.__hot.runs')).toEqual([
      'value v1',
      'derived v1-h1',
      'stop v1',
      'value v2',
      'derived v2-h1',
    ]);
  });

  test('stops propagation of a helper edit at the module that imports it', async ({ expect }) => {
    await write('helper.ts', `export const suffix = 'h2';`);
    await waitForDerived('from v2-h2');
    expect(await page.evaluate('window.__hot.loads')).toBe(1);
  });

  test('recovers when a broken edit is fixed', async ({ expect }) => {
    await write('value.ts', valueBody('broken'));
    await page.waitForFunction('window.__hot.failed', undefined, { timeout: 30_000 });
    expect(await page.evaluate('window.__hot.derived')).toBeUndefined();
    // Vite's watcher drops a write that lands within ~100ms of the previous one; a person's saves never do.
    await new Promise((resolve) => setTimeout(resolve, 500));
    await write('value.ts', valueBody('v3'));
    await waitForDerived('from v3-h2');
    expect(await page.evaluate('window.__hot.loads')).toBe(1);
  });

  test('re-creates the plugin when its definition changes, keeping unchanged modules running', async ({ expect }) => {
    const runs = await page.evaluate('window.__hot.runs.length');
    await write('plugin.ts', pluginDefinition({ extra: true }));
    await page.waitForFunction(`window.__hot?.extra === 'added'`, undefined, { timeout: 30_000 });
    // The value and derived modules are the same module objects, so neither re-ran.
    expect(await page.evaluate('window.__hot.runs.length')).toBe(runs);
    expect(await page.evaluate('window.__hot.derived')).toBe('from v3-h2');
    expect(await page.evaluate('window.__hot.loads')).toBe(1);
  });
});
