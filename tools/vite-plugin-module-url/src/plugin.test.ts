//
// Copyright 2026 DXOS.org
//

import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build, createBuilder, createServer } from 'vite';
import { describe, expect, onTestFinished, test } from 'vitest';

import { ModuleUrlPlugin } from './index.ts';

const loadDevUrlModule = async (base: string | undefined, file: string): Promise<string | undefined> => {
  const server = await createServer({
    root: fixtureDir,
    base,
    configFile: false,
    logLevel: 'silent',
    plugins: [ModuleUrlPlugin()],
    server: { middlewareMode: true, ws: false },
  });
  try {
    return (await server.transformRequest(`${file}?module-url`))?.code;
  } finally {
    await server.close();
  }
};

const fixtureDir = resolve(import.meta.dirname, '../test/fixture');
const sharedDir = resolve(import.meta.dirname, '../test/shared');

describe('ModuleUrlPlugin', () => {
  test('build bundles the TS module on its own, exports kept, sharing nothing with the importer', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'module-url-'));
    onTestFinished(() => rm(outDir, { recursive: true, force: true }));

    await build({
      root: fixtureDir,
      configFile: false,
      logLevel: 'silent',
      plugins: [ModuleUrlPlugin()],
      worker: { format: 'es', plugins: () => [ModuleUrlPlugin()] },
      build: {
        outDir,
        minify: false,
        rollupOptions: {
          input: join(fixtureDir, 'main.ts'),
          preserveEntrySignatures: 'strict',
          output: { entryFileNames: '[name].js', chunkFileNames: '[name].js' },
        },
      },
    });

    const assets = await readdir(join(outDir, 'assets'));
    const bundle = assets.find((name) => /^geometry-.*\.js$/.test(name));
    expect(bundle).toBeDefined();
    const main = await readFile(join(outDir, 'main.js'), 'utf8');
    expect(main).toContain(`assets/${bundle}`);
    // Self-contained: the relative import is inlined rather than split into a chunk shared with main.
    const code = await readFile(join(outDir, 'assets', `${bundle}`), 'utf8');
    expect(code).not.toMatch(/from\s*["']\./);

    // Exercises the bundle as a worker would: import it by URL and call the compiled class.
    const geometry = await import(pathToFileURL(join(outDir, 'assets', `${bundle}`)).href);
    const length = new geometry.Path().add({ x: 0, y: 0 }).add({ x: 3, y: 4 }).length();
    expect(length).toEqual({ value: 5, unit: 'px' });
  });

  test('an environment builds its entries as one graph, so they share module instances', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'module-url-'));
    onTestFinished(() => rm(outDir, { recursive: true, force: true }));

    const builder = await createBuilder({
      root: sharedDir,
      configFile: false,
      logLevel: 'silent',
      plugins: [ModuleUrlPlugin({ environment: { entries: ['host.ts', 'plugin.ts'] } })],
      worker: { format: 'es' },
      build: {
        outDir,
        minify: false,
        rollupOptions: {
          input: join(sharedDir, 'main.ts'),
          preserveEntrySignatures: 'strict',
          output: { entryFileNames: '[name].js', chunkFileNames: '[name].js' },
        },
      },
    });
    await builder.buildApp();

    const assets = await readdir(join(outDir, 'assets'));
    const host = assets.find((name) => /^host-.*\.js$/.test(name));
    const plugin = assets.find((name) => /^plugin-.*\.js$/.test(name));
    expect(host).toBeDefined();
    expect(plugin).toBeDefined();
    const main = await readFile(join(outDir, 'main.js'), 'utf8');
    expect(main).toContain(`assets/${host}`);
    expect(main).toContain(`assets/${plugin}`);
    // `state.ts` is split into a chunk both entries import, not inlined into each.
    expect(await readFile(join(outDir, 'assets', `${plugin}`), 'utf8')).toMatch(/from\s*["']\.\//);

    // One realm importing both by URL sees one instance of the module they share.
    const { hostToken } = await import(pathToFileURL(join(outDir, 'assets', `${host}`)).href);
    const { pluginToken } = await import(pathToFileURL(join(outDir, 'assets', `${plugin}`)).href);
    expect(typeof hostToken).toBe('symbol');
    expect(pluginToken).toBe(hostToken);
  });

  test('serve resolves to the /@fs/ URL, which the dev server compiles from TS', async () => {
    const server = await createServer({
      root: fixtureDir,
      configFile: false,
      logLevel: 'silent',
      plugins: [ModuleUrlPlugin()],
      server: { middlewareMode: true, ws: false },
    });
    onTestFinished(() => server.close());

    const main = await server.transformRequest('/main.ts');
    expect(main?.code).toMatch(/geometry\.ts\?module-url/);

    const urlModule = await server.transformRequest(`${join(fixtureDir, 'geometry.ts')}?module-url`);
    expect(urlModule?.code).toContain(`/@fs${join(fixtureDir, 'geometry.ts')}`);

    const compiled = await server.transformRequest(`/@fs${join(fixtureDir, 'geometry.ts')}?worker_file&type=module`);
    expect(compiled?.code).toMatch(/vite\/dist\/client\/env\.mjs/);
    expect(compiled?.code).toContain('class Path');
    expect(compiled?.code).not.toMatch(/interface Measured|satisfies/);
  });

  test.each([
    ['/app/', '/app/@fs'],
    ['https://cdn.example.com/app/', '/app/@fs'],
    ['./', '/@fs'],
  ])('serve maps base %s to a %s path', async (base, prefix) => {
    const file = join(fixtureDir, 'geometry.ts');
    expect(await loadDevUrlModule(base, file)).toContain(`"${prefix}${file}?worker_file&type=module"`);
  });
});
