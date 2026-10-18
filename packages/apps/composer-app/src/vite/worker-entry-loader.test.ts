//
// Copyright 2026 DXOS.org
//

import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { type Plugin, build } from 'vite';
import { describe, onTestFinished, test, vi } from 'vitest';

import { ModuleUrlPlugin } from '@dxos/vite-plugin-module-url';

import { workerEntryLoader } from './worker-entry-loader.ts';

/** Shaped like the data worker: a module the entry and its lazily loaded chunk both import. */
const FIXTURE: Record<string, string> = {
  'main.ts': `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });`,
  'shared.ts': `export const shared = (from: string) => from + ':shared';`,
  'lazy.ts': `import { shared } from './shared.ts';\nexport const lazy = () => shared('lazy');`,
  'worker.ts': [
    `import { shared } from './shared.ts';`,
    `const scope = globalThis as any;`,
    `scope.workerEvaluations = (scope.workerEvaluations ?? 0) + 1;`,
    `scope.received = [];`,
    `for (const type of ['connect', 'message']) {`,
    `  addEventListener(type, (event: MessageEvent) => scope.received.push(type + ':' + event.data));`,
    `}`,
    `scope.lazyResult = import('./lazy.ts').then(({ lazy }) => [shared('worker'), lazy()]);`,
  ].join('\n'),
};

type Chunk = { fileName: string; code: string; imports: string[] };

/** Builds the fixture with `plugins` in the worker pipeline and returns every emitted chunk. */
const buildFixture = async (
  plugins: Plugin[],
  files: Record<string, string> = FIXTURE,
): Promise<{ assets: string; chunks: Chunk[] }> => {
  const root = await mkdtemp(path.join(tmpdir(), 'worker-entry-loader-'));
  onTestFinished(() => rm(root, { recursive: true, force: true }));
  await Promise.all(Object.entries(files).map(([name, code]) => writeFile(path.join(root, name), code)));
  const outDir = path.join(root, 'out');
  await build({
    root,
    configFile: false,
    logLevel: 'silent',
    worker: { format: 'es', plugins: () => plugins },
    build: { outDir, minify: false, rollupOptions: { input: path.join(root, 'main.ts') } },
  });

  const assets = path.join(outDir, 'assets');
  const chunks = await Promise.all(
    (await readdir(assets))
      .filter((fileName) => fileName.endsWith('.js'))
      .map(async (fileName) => {
        const code = await readFile(path.join(assets, fileName), 'utf8');
        const imports = [...code.matchAll(/(?:from\s*|import\s*\(\s*)["'`]\.\/([^"'`]+\.js)["'`]/g)].map(
          ([, imported]) => imported,
        );
        return { fileName, code, imports };
      }),
  );
  return { assets, chunks };
};

/** The chunk the page hands to `new Worker`. */
const workerEntryOf = (chunks: Chunk[]): Chunk => {
  const main = chunks.find((chunk) => chunk.fileName.startsWith('main-'));
  const entryName = main?.code.match(/assets\/([\w-]+\.js)/)?.[1];
  const entry = chunks.find((chunk) => chunk.fileName === entryName);
  if (!entry) {
    throw new Error(`worker entry ${entryName} not found`);
  }
  return entry;
};

describe('workerEntryLoader', () => {
  test('without it, a lazily loaded chunk imports the worker entry', async ({ expect }) => {
    const { chunks } = await buildFixture([]);
    const entry = workerEntryOf(chunks);
    const lazy = chunks.find((chunk) => chunk.fileName.startsWith('lazy-'));
    expect(lazy?.imports).toContain(entry.fileName);
  });

  test('the worker entry is a loader that no chunk imports', async ({ expect }) => {
    const { chunks } = await buildFixture([workerEntryLoader()]);
    const entry = workerEntryOf(chunks);
    expect(entry.code).not.toMatch(/\bexport\b/);
    expect(entry.imports).toHaveLength(1);
    const importers = chunks.filter((chunk) => chunk.imports.includes(entry.fileName));
    expect(importers.map((chunk) => chunk.fileName)).toEqual([]);
  });

  test('the loader runs the worker module once, and replays what arrived before it loaded', async ({ expect }) => {
    const { assets, chunks } = await buildFixture([workerEntryLoader()]);
    const scope = globalThis as { workerEvaluations?: number; received?: string[]; lazyResult?: Promise<string[]> };
    // Stands in for the worker global, which node does not have.
    const workerScope = new EventTarget();
    vi.stubGlobal('addEventListener', workerScope.addEventListener.bind(workerScope));
    vi.stubGlobal('removeEventListener', workerScope.removeEventListener.bind(workerScope));
    vi.stubGlobal('dispatchEvent', workerScope.dispatchEvent.bind(workerScope));
    onTestFinished(() => {
      vi.unstubAllGlobals();
      delete scope.workerEvaluations;
      delete scope.received;
      delete scope.lazyResult;
    });

    await import(pathToFileURL(path.join(assets, workerEntryOf(chunks).fileName)).href);
    expect(scope.workerEvaluations).toBeUndefined();
    workerScope.dispatchEvent(new MessageEvent('connect', { data: 'early' }));
    workerScope.dispatchEvent(new MessageEvent('message', { data: 'early' }));

    await vi.waitFor(() => expect(scope.received).toEqual(['connect:early', 'message:early']));
    workerScope.dispatchEvent(new MessageEvent('message', { data: 'late' }));
    expect(scope.received).toEqual(['connect:early', 'message:early', 'message:late']);
    expect(await scope.lazyResult).toEqual(['worker:shared', 'lazy:shared']);
    expect(scope.workerEvaluations).toEqual(1);
  });

  test('a `?module-url` chunk the worker emits keeps its exports', async ({ expect }) => {
    const { chunks } = await buildFixture([ModuleUrlPlugin(), workerEntryLoader()], {
      ...FIXTURE,
      'helper.ts': `export const helper = () => 'helper';`,
      'worker.ts': `import helperUrl from './helper.ts?module-url';\n(globalThis as any).helperUrl = helperUrl;`,
    });
    const helper = chunks.find((chunk) => chunk.fileName.startsWith('helper-'));
    expect(helper?.code).toMatch(/export\s*\{\s*helper\s*\}/);
  });
});
