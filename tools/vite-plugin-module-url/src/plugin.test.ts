//
// Copyright 2026 DXOS.org
//

import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build, createServer } from 'vite';
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
const conditionsDir = resolve(import.meta.dirname, '../test/__fixtures__/conditions');
const WORKER_CONDITIONS = { workerConditions: ['plugin-worker'] };
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

  test('a module hosted by a worker is a chunk of the worker build, sharing its modules', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'module-url-'));
    onTestFinished(() => rm(outDir, { recursive: true, force: true }));

    const options = { workers: { 'host.ts': ['plugin.ts'] } };
    await build({
      root: sharedDir,
      configFile: false,
      logLevel: 'silent',
      plugins: [ModuleUrlPlugin(options)],
      worker: { format: 'es', plugins: () => [ModuleUrlPlugin(options)] },
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

    const assets = await readdir(join(outDir, 'assets'));
    const host = assets.find((name) => /^host-.*\.js$/.test(name));
    const plugin = assets.find((name) => /^plugin-.*\.js$/.test(name));
    expect(host).toBeDefined();
    expect(plugin).toBeDefined();
    const main = await readFile(join(outDir, 'main.js'), 'utf8');
    expect(main).toContain(`assets/${host}`);
    expect(main).toContain(`./assets/${plugin}`);

    // `state.ts` is not copied into the hosted module: it imports it from the worker's own chunks.
    const imports = (code: string) => [...code.matchAll(/from\s*["']\.\/([^"']+)["']/g)].map(([, name]) => name);
    const hostImports = imports(await readFile(join(outDir, 'assets', `${host}`), 'utf8'));
    const pluginImports = imports(await readFile(join(outDir, 'assets', `${plugin}`), 'utf8'));
    expect(pluginImports.some((name) => name === host || hostImports.includes(name))).toBe(true);

    // One realm loading the worker entry and the module sees one instance of what they share.
    await import(pathToFileURL(join(outDir, 'assets', `${host}`)).href);
    const { pluginToken } = await import(pathToFileURL(join(outDir, 'assets', `${plugin}`)).href);
    expect(typeof pluginToken).toBe('symbol');
    expect(pluginToken).toBe((globalThis as { hostToken?: symbol }).hostToken);
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

    const compiled = await server.transformRequest(`/@fs${join(fixtureDir, 'geometry.ts')}`);
    expect(compiled?.code).toContain('class Path');
    expect(compiled?.code).not.toMatch(/interface Measured|satisfies/);
  });

  test('a worker build resolves `#` subpaths with the worker conditions, and the page build never sees them', async () => {
    const outDir = await mkdtemp(join(tmpdir(), 'module-url-'));
    onTestFinished(() => rm(outDir, { recursive: true, force: true }));

    await build({
      root: conditionsDir,
      configFile: false,
      logLevel: 'silent',
      plugins: [ModuleUrlPlugin(WORKER_CONDITIONS)],
      worker: { format: 'es', plugins: () => [ModuleUrlPlugin(WORKER_CONDITIONS)] },
      build: {
        outDir,
        minify: false,
        rollupOptions: {
          input: join(conditionsDir, 'main.ts'),
          preserveEntrySignatures: 'strict',
          output: { entryFileNames: '[name].js', chunkFileNames: '[name].js' },
        },
      },
    });

    const main = await readFile(join(outDir, 'main.js'), 'utf8');
    expect(main).toContain('page-realm');
    expect(main).not.toContain('worker-realm');
    const host = (await readdir(join(outDir, 'assets'))).find((name) => /^host-.*\.js$/.test(name));
    const hostCode = await readFile(join(outDir, 'assets', `${host}`), 'utf8');
    expect(hostCode).toContain('worker-realm');
    expect(hostCode).not.toContain('page-realm');
  });

  test("serve tags a worker realm's imports, so `#` subpaths resolve with the worker conditions there only", async () => {
    const server = await createServer({
      root: conditionsDir,
      configFile: false,
      logLevel: 'silent',
      plugins: [ModuleUrlPlugin(WORKER_CONDITIONS)],
      server: { middlewareMode: true, ws: false },
    });
    onTestFinished(() => server.close());

    const page = await server.transformRequest('/main.ts');
    expect(page?.code).toContain('/realm.page.ts');
    expect(page?.code).not.toContain('dx-worker');

    const host = await server.transformRequest('/host.ts?worker_file&type=module');
    expect(host?.code).toContain('/realm.worker.ts?dx-worker');
    expect(host?.code).toContain('/label.ts?dx-worker');
    // Only scripts are tagged: Vite's transforms for other files do not expect the query.
    expect(host?.code).toMatch(/\/data\.json(?!\?dx-worker)/);

    // What a tagged module imports stays in the worker realm.
    const label = await server.transformRequest('/label.ts?dx-worker');
    expect(label?.code).toContain('label');
  });

  test("serve leaves a worker realm's imports untagged without worker conditions", async () => {
    const server = await createServer({
      root: conditionsDir,
      configFile: false,
      logLevel: 'silent',
      plugins: [ModuleUrlPlugin()],
      server: { middlewareMode: true, ws: false },
    });
    onTestFinished(() => server.close());

    const host = await server.transformRequest('/host.ts?worker_file&type=module');
    expect(host?.code).toContain('/realm.page.ts');
    expect(host?.code).not.toContain('dx-worker');
  });

  test.each([
    ['/app/', '/app/@fs'],
    ['https://cdn.example.com/app/', '/app/@fs'],
    ['./', '/@fs'],
  ])('serve maps base %s to a %s path', async (base, prefix) => {
    const file = join(fixtureDir, 'geometry.ts');
    expect(await loadDevUrlModule(base, file)).toContain(`"${prefix}${file}"`);
  });
});
