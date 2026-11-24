//
// Copyright 2026 DXOS.org
//

import { existsSync } from 'node:fs';
import { mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { type Browser, chromium } from 'playwright';
import { type PreviewServer, build, defaultClientConditions, preview, searchForWorkspaceRoot } from 'vite';
import { afterAll, beforeAll, describe, test } from 'vitest';

import { collectChunkCss, collectPageCss, pluginConfigPlugin } from './index.ts';

// The cloud sandbox ships its own Chromium build rather than the one this Playwright version pins.
const executablePath = process.env.CLAUDE_CODE_REMOTE ? '/opt/pw-browsers/chromium' : undefined;
// The last test drives a real browser, which only exists where Playwright's Chromium has been installed.
const hasBrowser = existsSync(executablePath ?? chromium.executablePath());

const packageRoot = path.resolve(import.meta.dirname, '../../..');
const coreDir = path.join(packageRoot, 'src/core');
const workspaceRoot = searchForWorkspaceRoot(packageRoot);

// Absolute, so the build-time evaluator (which has none of the build's aliases) and the app load the
// same framework source.
const core = (file: string) => JSON.stringify(path.join(coreDir, file));

const body = (name: string, imports: string[]) => `
  ${imports.map((file) => `import ${JSON.stringify(file)};`).join('\n')}
  import * as Effect from 'effect/Effect';
  import * as Capability from ${core('capability.ts')};
  import { ${name} } from './capabilities.ts';
  export default Capability.makeModule(() => Effect.succeed([Capability.contribute(${name}, {})]));
`;

// A plugin whose bodies import CSS: `value` its own, one the page also imports and, like `extra`, one
// through a module they share.
const files: Record<string, string> = {
  'index.html': '<!doctype html><html><body><script type="module" src="/main.ts"></script></body></html>',
  'capabilities.ts': `
    import * as Capability from ${core('capability.ts')};
    export const Value = Capability.makeSingleton()('org.dxos.test.css.value');
    export const Extra = Capability.makeSingleton()('org.dxos.test.css.extra');
  `,
  'shared.css': 'body { --dx-test-shared: linked; }',
  'shared.ts': `import './shared.css'; export const shared = 'shared';`,
  'value.css': 'body { --dx-test-value: linked; }',
  'page.css': 'body { --dx-test-page: linked; }',
  'value.ts': body('Value', ['./page.css', './shared.ts', './value.css']),
  'extra.ts': body('Extra', ['./shared.ts']),
  'dx.config.ts': `
    import * as Capability from ${core('capability.ts')};
    import * as Plugin from ${core('plugin.ts')};
    import { Extra, Value } from './capabilities.ts';
    export default Plugin.config({
      plugin: { key: 'org.dxos.plugin.css', name: 'Css', description: '__DX_TEST_MANIFEST__' },
      modules: [
        Capability.lazyModule('Value', { provides: [Value] }, () =>
          import('./value.ts', { with: { type: 'module-url' } }),
        ),
        Capability.lazyModule('Extra', { provides: [Extra] }, () =>
          import('./extra.ts', { with: { type: 'module-url' } }),
        ),
      ],
    });
  `,
  'main.ts': `
    import * as Effect from 'effect/Effect';
    import * as PluginManager from ${core('plugin-manager/index.ts')};
    import { ActivationEvents } from '#common/index.ts';
    import config from './dx.config.ts';
    import './page.css';

    const manager = PluginManager.make({
      plugins: [config.make()],
      enabled: [config.meta.profile.key],
      pluginLoader: (id) => Effect.fail(new Error(id)),
    });
    await Effect.runPromise(Effect.andThen(manager.start(), manager.activate(ActivationEvents.Idle)));
    window.__activated = true;
  `,
};

describe('collectChunkCss', () => {
  test('lists the stylesheets of a chunk and its static imports once, dependencies first', ({ expect }) => {
    const chunk = (imports: string[], css: string[]) => ({
      type: 'chunk',
      imports,
      viteMetadata: { importedCss: new Set(css) },
    });
    const bundle = {
      'body.js': chunk(['shared.js', 'leaf.js'], ['body.css']),
      'shared.js': chunk(['leaf.js', 'body.js'], ['shared.css']),
      'leaf.js': chunk([], ['leaf.css']),
      'other.js': chunk([], ['other.css']),
      'body.css': { type: 'asset' },
    };
    expect(collectChunkCss(bundle, 'body.js')).toEqual(['leaf.css', 'shared.css', 'body.css']);
  });
});

describe('collectPageCss', () => {
  const chunk = (css: string[], imports: string[] = [], dynamicImports: string[] = []) => ({
    type: 'chunk',
    imports,
    dynamicImports,
    viteMetadata: { importedCss: new Set(css) },
  });
  const page = (file: string, ...rest: Parameters<typeof chunk>) => ({
    ...chunk(...rest),
    isEntry: true,
    facadeModuleId: `/app/${file}`,
  });
  const bundle = {
    'index.js': page('index.html', ['index.css'], ['theme.js'], ['plugin.js']),
    'viewer.js': page('viewer.html', ['viewer.css'], ['theme.js'], ['plugin.js']),
    'paused.js': page('paused.html', []),
    'theme.js': chunk(['theme.css']),
    'plugin.js': chunk([], [], ['manifest.js']),
    'manifest.js': chunk([]),
    // An emitted body is an entry too, but not a page.
    'body.js': { ...chunk(['body.css'], [], ['lazy.js']), isEntry: true, facadeModuleId: '/app/body.ts' },
    'lazy.js': chunk([]),
  };

  test('keeps the stylesheets of every page that can load the chunk', ({ expect }) => {
    const pageCss = collectPageCss(bundle);
    expect([...pageCss('manifest.js')]).toEqual(['theme.css']);
    expect([...pageCss('theme.js')]).toEqual(['theme.css']);
  });

  test('follows the chunks a manifest imports by URL', ({ expect }) => {
    expect([...collectPageCss(bundle)('lazy.js')]).toEqual([]);
    expect([...collectPageCss(bundle, new Map([['manifest.js', ['body.js']]]))('lazy.js')]).toEqual(['theme.css']);
  });
});

type Fixture = { dir: string; html: string; assets: Record<string, string> };

/** Builds the fixture as an app and reads back what the build wrote to `dist/assets`. */
const buildFixture = async (base: string, overrides: Record<string, string> = {}): Promise<Fixture> => {
  const dir = await mkdtemp(path.join(tmpdir(), 'plugin-config-css-'));
  // Bare imports in the fixture resolve through the package's own dependencies.
  await symlink(path.join(packageRoot, 'node_modules'), path.join(dir, 'node_modules'));
  await Promise.all(
    Object.entries({ ...files, ...overrides }).map(([file, content]) => writeFile(path.join(dir, file), content)),
  );

  await build({
    root: dir,
    base,
    configFile: false,
    logLevel: 'error',
    plugins: [pluginConfigPlugin()],
    resolve: {
      alias: [
        // The manifest module the config is built as imports the framework by its package name.
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
  });

  const assetsDir = path.join(dir, 'dist/assets');
  const names = await readdir(assetsDir);
  const assets = Object.fromEntries(
    await Promise.all(names.map(async (name) => [name, await readFile(path.join(assetsDir, name), 'utf8')] as const)),
  );
  return { dir, html: await readFile(path.join(dir, 'dist/index.html'), 'utf8'), assets };
};

const named = ({ assets }: Fixture, pattern: RegExp) => Object.keys(assets).filter((name) => pattern.test(name));

/** The chunk the plugin's manifest was built into. */
const manifestChunk = (fixture: Fixture): string => {
  const [name] = named(fixture, /\.js$/).filter((script) => fixture.assets[script].includes('__DX_TEST_MANIFEST__'));
  if (name === undefined) {
    throw new Error('build has no manifest chunk');
  }
  return name;
};

describe.each([
  { base: '/', prefix: '/assets/' },
  { base: './', prefix: './' },
])('stylesheets of a dx.config.ts plugin in an app build with base $base', { timeout: 120_000 }, ({ base, prefix }) => {
  let fixture: Fixture;

  beforeAll(async () => {
    fixture = await buildFixture(base);
  }, 120_000);

  afterAll(async () => {
    if (fixture !== undefined) {
      await rm(fixture.dir, { recursive: true, force: true });
    }
  });

  test('every stylesheet the build emits is named by a script', ({ expect }) => {
    const stylesheets = named(fixture, /\.css$/);
    expect(stylesheets).toHaveLength(3);
    const referrers = [fixture.html, ...named(fixture, /\.js$/).map((name) => fixture.assets[name])];
    const orphans = stylesheets.filter((stylesheet) => !referrers.some((code) => code.includes(stylesheet)));
    expect(orphans).toEqual([]);
  });

  test('the manifest lists each body with the stylesheets its chunk and imports add to the page', ({ expect }) => {
    const manifest = fixture.assets[manifestChunk(fixture)];
    expect(manifest).not.toContain('__DX_CSS_');

    // The page links its own stylesheet; the shared module lands in whichever chunk the bundler picks.
    const [pageCss] = named(fixture, /\.css$/).filter((name) => fixture.html.includes(name));
    const [valueCss] = named(fixture, /^value-.*\.css$/);
    const [sharedCss] = named(fixture, /\.css$/).filter((name) => name !== valueCss && name !== pageCss);
    expect(fixture.assets[pageCss]).toContain('--dx-test-page');
    const lists = Array.from(manifest.matchAll(/css:\[([^\]]*)\]/g), ([, list]) => list.replace(/["'`]/g, ''));
    expect(lists).toEqual([`${prefix}${sharedCss},${prefix}${valueCss}`, `${prefix}${sharedCss}`]);
  });

  // The manifest is cached by name, so one naming a stylesheet that no longer exists would break its body.
  test('a stylesheet change renames the manifest chunk', async ({ expect }) => {
    const changed = await buildFixture(base, { 'value.css': 'body { --dx-test-value: changed; }' });
    try {
      expect(named(changed, /^value-.*\.css$/)).not.toEqual(named(fixture, /^value-.*\.css$/));
      expect(manifestChunk(changed)).not.toEqual(manifestChunk(fixture));
    } finally {
      await rm(changed.dir, { recursive: true, force: true });
    }
  });

  describe.skipIf(!hasBrowser)('in a browser', () => {
    let server: PreviewServer;
    let browser: Browser;

    beforeAll(async () => {
      server = await preview({ root: fixture.dir, base, configFile: false, logLevel: 'error', preview: { port: 0 } });
      browser = await chromium.launch({ executablePath });
    });

    afterAll(async () => {
      await browser?.close();
      await server?.close();
    });

    test("a body's stylesheets apply once its module has activated", async ({ expect }) => {
      const url = server.resolvedUrls?.local[0];
      if (url === undefined) {
        throw new Error('preview server has no local url');
      }
      const page = await browser.newPage();
      page.on('pageerror', (error) => console.error('[page]', error));
      await page.goto(url);
      await page.waitForFunction('window.__activated === true', undefined, { timeout: 30_000 });

      const property = (name: string) =>
        page.evaluate(`getComputedStyle(document.body).getPropertyValue(${JSON.stringify(name)}).trim()`);
      expect(await property('--dx-test-value')).toBe('linked');
      expect(await property('--dx-test-shared')).toBe('linked');
      expect(await property('--dx-test-page')).toBe('linked');
      expect(await page.evaluate(`document.querySelectorAll('link[rel="stylesheet"]').length`)).toBe(3);
    });
  });
});
