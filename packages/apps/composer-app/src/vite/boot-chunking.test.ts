//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  type ModuleGraph,
  bootChunking,
  computeBootPartition,
  computeLazyPartition,
  makePackageOf,
  toBootModuleId,
} from './boot-chunking.ts';

/** Package roots for the fake ids below: `/repo/packages/<area>/<name>` and one nested package. */
const PACKAGE_ROOTS = new Set([
  '/repo/packages/plugins/plugin-a',
  '/repo/packages/plugins/plugin-b',
  '/repo/packages/plugins/plugin-c',
  '/repo/packages/common/rpc',
  '/repo/packages/core/echo/echo-host',
]);
const packageOf = makePackageOf((dir) => PACKAGE_ROOTS.has(dir));

const ENTRY = '/repo/packages/apps/app/src/main.tsx';

type FakeModule = { imports?: string[]; dynamicImports?: string[]; bytes?: number };

/** A module graph shaped like rolldown's, built from an id -> imports/size map. */
const makeGraph = (modules: Record<string, FakeModule>): ModuleGraph => ({
  getModuleInfo: (moduleId) => {
    const module = modules[moduleId];
    if (!module) {
      return null;
    }
    const entries = Object.entries(modules);
    return {
      importedIds: module.imports ?? [],
      dynamicallyImportedIds: module.dynamicImports ?? [],
      importers: entries.filter(([, m]) => m.imports?.includes(moduleId)).map(([id]) => id),
      dynamicImporters: entries.filter(([, m]) => m.dynamicImports?.includes(moduleId)).map(([id]) => id),
      code: 'x'.repeat(module.bytes ?? 0),
    };
  },
  getModuleIds: () => Object.keys(modules),
});

const silent = { info: () => {}, warn: () => {} };

/** Bucket of each module, keyed by id, for a graph whose entry is `ENTRY`. */
const partitionOf = (modules: Record<string, FakeModule>, targetBytes?: number) =>
  computeBootPartition(makeGraph(modules), { entry: ENTRY, targetBytes, log: silent });

describe('toBootModuleId', () => {
  test('strips the query', ({ expect }) => {
    expect(toBootModuleId('/repo/node_modules/react/index.js?v=1')).toEqual('/repo/node_modules/react/index.js');
  });

  test('rejects virtual modules and app source', ({ expect }) => {
    expect(toBootModuleId('\0virtual:thing')).toBeNull();
    expect(toBootModuleId('/repo/packages/apps/app/src/main.tsx')).toBeNull();
    expect(toBootModuleId('/repo/packages/plugins/plugin-x/src/index.ts')).not.toBeNull();
  });

  test('honours a custom app-source pattern', ({ expect }) => {
    expect(toBootModuleId('/work/apps/site/main.ts', /\/apps\//)).toBeNull();
    expect(toBootModuleId('/repo/packages/apps/app/src/main.tsx', /\/apps\//)).toBeNull();
  });
});

describe('computeBootPartition', () => {
  test('returns an empty partition when the entry is absent from the graph', ({ expect }) => {
    expect(partitionOf({ '/repo/node_modules/a/index.js': {} }).size).toEqual(0);
  });

  test('returns an empty partition when the entry reaches nothing groupable', ({ expect }) => {
    // App source and virtuals are never captured, so a closure of only those yields no buckets.
    expect(
      partitionOf({
        [ENTRY]: { imports: ['/repo/packages/apps/app/src/other.tsx', '\0virtual:env'] },
        '/repo/packages/apps/app/src/other.tsx': {},
        '\0virtual:env': {},
      }).size,
    ).toEqual(0);
  });

  test('captures the static closure and excludes the app entry itself', ({ expect }) => {
    const partition = partitionOf({
      [ENTRY]: { imports: ['/repo/node_modules/a/index.js'] },
      '/repo/node_modules/a/index.js': { imports: ['/repo/node_modules/b/index.js'] },
      '/repo/node_modules/b/index.js': {},
      // Unreachable from the entry.
      '/repo/node_modules/lazy/index.js': {},
    });

    expect([...partition.keys()].sort()).toEqual(['/repo/node_modules/a/index.js', '/repo/node_modules/b/index.js']);
  });

  test('emits dependencies before their dependents', ({ expect }) => {
    const partition = partitionOf(
      {
        [ENTRY]: { imports: ['/repo/node_modules/a/index.js'] },
        '/repo/node_modules/a/index.js': { imports: ['/repo/node_modules/b/index.js'], bytes: 100 },
        '/repo/node_modules/b/index.js': { imports: ['/repo/node_modules/c/index.js'], bytes: 100 },
        '/repo/node_modules/c/index.js': { bytes: 100 },
      },
      // One module per bucket, so bucket order is evaluation order.
      1,
    );

    expect(partition.get('/repo/node_modules/c/index.js')).toBeLessThan(
      partition.get('/repo/node_modules/b/index.js')!,
    );
    expect(partition.get('/repo/node_modules/b/index.js')).toBeLessThan(
      partition.get('/repo/node_modules/a/index.js')!,
    );
  });

  test('keeps a cycle in a single bucket even below the size target', ({ expect }) => {
    // A cycle has no correct split point, so Tarjan must emit it as one indivisible component.
    const partition = partitionOf(
      {
        [ENTRY]: { imports: ['/repo/node_modules/a/index.js'] },
        '/repo/node_modules/a/index.js': { imports: ['/repo/node_modules/b/index.js'], bytes: 100 },
        '/repo/node_modules/b/index.js': { imports: ['/repo/node_modules/a/index.js'], bytes: 100 },
      },
      1,
    );

    expect(partition.get('/repo/node_modules/a/index.js')).toEqual(partition.get('/repo/node_modules/b/index.js'));
  });

  test('never emits a cross-bucket edge pointing forwards', ({ expect }) => {
    // The DAG invariant the whole partition exists to guarantee: plain ESM ordering is only
    // correct when every chunk imports strictly earlier chunks.
    const modules: Record<string, FakeModule> = {
      [ENTRY]: { imports: ['/repo/node_modules/a/index.js', '/repo/node_modules/d/index.js'] },
      '/repo/node_modules/a/index.js': {
        imports: ['/repo/node_modules/b/index.js', '/repo/node_modules/c/index.js'],
        bytes: 400,
      },
      '/repo/node_modules/b/index.js': { imports: ['/repo/node_modules/c/index.js'], bytes: 400 },
      '/repo/node_modules/c/index.js': { imports: ['/repo/node_modules/e/index.js'], bytes: 400 },
      '/repo/node_modules/d/index.js': { imports: ['/repo/node_modules/b/index.js'], bytes: 400 },
      '/repo/node_modules/e/index.js': { bytes: 400 },
    };
    const partition = partitionOf(modules, 500);

    expect(new Set(partition.values()).size).toBeGreaterThan(1);
    for (const [id, module] of Object.entries(modules)) {
      const from = partition.get(id);
      if (from === undefined) {
        continue;
      }
      for (const dep of module.imports ?? []) {
        const to = partition.get(dep);
        if (to !== undefined) {
          expect(to).toBeLessThanOrEqual(from);
        }
      }
    }
  });

  test('collapses edges that route through an uncaptured module', ({ expect }) => {
    // `a` reaches `b` only via app source. Dropping that edge would let the partition place `b`
    // after `a` and manufacture a chunk cycle through the intermediary's chunk.
    const partition = partitionOf(
      {
        [ENTRY]: { imports: ['/repo/node_modules/a/index.js'] },
        '/repo/node_modules/a/index.js': { imports: ['/repo/packages/apps/app/src/bridge.ts'], bytes: 100 },
        '/repo/packages/apps/app/src/bridge.ts': { imports: ['/repo/node_modules/b/index.js'] },
        '/repo/node_modules/b/index.js': { bytes: 100 },
      },
      1,
    );

    expect(partition.get('/repo/node_modules/b/index.js')).toBeLessThan(
      partition.get('/repo/node_modules/a/index.js')!,
    );
  });

  test('opens a new bucket once the target is exceeded, but never splits below it', ({ expect }) => {
    const modules: Record<string, FakeModule> = {
      [ENTRY]: { imports: ['/repo/node_modules/a/index.js'] },
      '/repo/node_modules/a/index.js': { imports: ['/repo/node_modules/b/index.js'], bytes: 60 },
      '/repo/node_modules/b/index.js': { imports: ['/repo/node_modules/c/index.js'], bytes: 60 },
      '/repo/node_modules/c/index.js': { bytes: 60 },
    };

    // 180 bytes total: one bucket at 1000, three at 100 (each component overflows the next).
    expect(new Set(partitionOf(modules, 1000).values()).size).toEqual(1);
    expect(new Set(partitionOf(modules, 100).values()).size).toEqual(3);
  });

  test('tolerates imports of modules absent from the graph', ({ expect }) => {
    const partition = partitionOf({
      [ENTRY]: { imports: ['/repo/node_modules/a/index.js'] },
      '/repo/node_modules/a/index.js': { imports: ['/repo/node_modules/missing/index.js'] },
    });

    expect([...partition.keys()]).toContain('/repo/node_modules/a/index.js');
  });
});

describe('bootChunking', () => {
  const modules: Record<string, FakeModule> = {
    [ENTRY]: { imports: ['/repo/node_modules/a/index.js'] },
    '/repo/node_modules/a/index.js': {},
  };

  test('names boot modules and passes everything else through', ({ expect }) => {
    const { groupName } = bootChunking({ entry: ENTRY, log: silent });
    const graph = makeGraph(modules);

    expect(groupName('/repo/node_modules/a/index.js', graph)).toEqual('boot-0');
    expect(groupName('/repo/node_modules/lazy/index.js', graph)).toBeNull();
    expect(groupName(ENTRY, graph)).toBeNull();
  });

  test('matches a module id carrying a query', ({ expect }) => {
    const { groupName } = bootChunking({ entry: ENTRY, log: silent });

    expect(groupName('/repo/node_modules/a/index.js?v=abc', makeGraph(modules))).toEqual('boot-0');
  });

  test('computes the partition once per build and recomputes after buildStart', ({ expect }) => {
    let graphReads = 0;
    const counting: ModuleGraph = {
      getModuleInfo: (moduleId) => {
        graphReads++;
        return makeGraph(modules).getModuleInfo(moduleId);
      },
    };
    const { groupName, plugin, reset } = bootChunking({ entry: ENTRY, log: silent });

    groupName('/repo/node_modules/a/index.js', counting);
    const afterFirst = graphReads;
    groupName('/repo/node_modules/a/index.js', counting);
    expect(graphReads).toEqual(afterFirst);

    // Watch rebuilds must not reuse the previous build's graph.
    expect(plugin).toMatchObject({ name: 'dxos-boot-chunking', apply: 'build', buildStart: reset });
    reset();
    groupName('/repo/node_modules/a/index.js', counting);
    expect(graphReads).toBeGreaterThan(afterFirst);
  });

  test('disables grouping when the entry is missing', ({ expect }) => {
    const warnings: string[] = [];
    const { groupName } = bootChunking({
      entry: '/repo/packages/apps/app/src/absent.tsx',
      log: { info: () => {}, warn: (message) => warnings.push(message) },
    });

    expect(groupName('/repo/node_modules/a/index.js', makeGraph(modules))).toBeNull();
    expect(warnings).toHaveLength(1);
  });
});

describe('makePackageOf', () => {
  test('names a workspace package by its nearest package.json, however deep the file', ({ expect }) => {
    expect(packageOf('/repo/packages/plugins/plugin-a/src/index.ts')).toEqual('plugin-a');
    expect(packageOf('/repo/packages/core/echo/echo-host/dist/lib/index.mjs')).toEqual('echo-host');
    expect(packageOf('/repo/packages/plugins/plugin-a/PLUGIN.mdl?raw')).toEqual('plugin-a');
  });

  test('leaves vendor and anything outside a package to rolldown', ({ expect }) => {
    expect(packageOf('/repo/node_modules/.pnpm/effect@3/node_modules/effect/Effect.js')).toBeNull();
    expect(packageOf('/repo/packages/plugins/plugin-a/node_modules/x/dist/a.js')).toBeNull();
    expect(packageOf('/repo/packages/orphan.ts')).toBeNull();
    expect(packageOf('/somewhere/else.js')).toBeNull();
  });
});

describe('computeLazyPartition', () => {
  const A = '/repo/packages/plugins/plugin-a/src/index.ts';
  const A2 = '/repo/packages/plugins/plugin-a/src/other.ts';
  const B = '/repo/packages/plugins/plugin-b/src/index.ts';
  const C = '/repo/packages/plugins/plugin-c/src/index.ts';
  const lazyPartitionOf = (modules: Record<string, FakeModule>, boot: string[] = [], lazyTargetBytes?: number) =>
    computeLazyPartition(makeGraph(modules), new Set(boot), { entry: ENTRY, lazyTargetBytes, packageOf, log: silent });

  test('groups a package into one chunk, skips boot and app source, absorbs a private outsider', ({ expect }) => {
    const partition = lazyPartitionOf(
      {
        [ENTRY]: { imports: ['/repo/node_modules/boot/index.js'] },
        '/repo/node_modules/boot/index.js': {},
        [A]: { imports: [A2, '/repo/packages/apps/app/src/util.ts', '/elsewhere/x.js'] },
        [A2]: {},
        '/repo/packages/apps/app/src/util.ts': {},
        '/elsewhere/x.js': {},
      },
      ['/repo/node_modules/boot/index.js'],
    );

    expect(partition.get(A)).toEqual('plugin-a');
    expect(partition.get(A2)).toEqual('plugin-a');
    expect(partition.has('/repo/node_modules/boot/index.js')).toBe(false);
    expect(partition.has('/repo/packages/apps/app/src/util.ts')).toBe(false);
    expect(partition.get('/elsewhere/x.js')).toEqual('plugin-a');
    expect(partition.has(ENTRY)).toBe(false);
  });

  test('merges packages that import each other into one group', ({ expect }) => {
    // A -> B -> A would make two chunks import each other; the group is the only correct split.
    const partition = lazyPartitionOf({
      [A]: { imports: [B] },
      [B]: { imports: [A] },
      [C]: { imports: [A] },
    });

    expect(partition.get(A)).toEqual('plugin-a+1');
    expect(partition.get(B)).toEqual('plugin-a+1');
    expect(partition.get(C)).toEqual('plugin-c');
  });

  test('collapses a package cycle that routes through an uncaptured module', ({ expect }) => {
    const via = '/repo/packages/apps/app/src/bridge.ts';
    const partition = lazyPartitionOf({
      [A]: { imports: [via] },
      [via]: { imports: [B] },
      [B]: { imports: [A] },
    });

    expect(partition.get(A)).toEqual(partition.get(B));
  });

  test('splits a large package in dependency order and never emits a forward edge', ({ expect }) => {
    const ids = Array.from({ length: 6 }, (_, i) => `/repo/packages/plugins/plugin-a/src/m${i}.ts`);
    const modules: Record<string, FakeModule> = {};
    ids.forEach((id, i) => {
      modules[id] = { imports: i + 1 < ids.length ? [ids[i + 1]] : [], bytes: 100 };
    });
    modules[B] = { imports: [ids[0]], bytes: 100 };
    const partition = lazyPartitionOf(modules, [], 250);
    const chunkIndex = (name: string) => Number(name.split('-').pop());

    const names = new Set(ids.map((id) => partition.get(id)));
    expect(names.size).toEqual(3);
    for (const name of names) {
      expect(name).toMatch(/^plugin-a-\d$/);
    }
    for (let i = 0; i + 1 < ids.length; i++) {
      expect(chunkIndex(partition.get(ids[i + 1])!)).toBeLessThanOrEqual(chunkIndex(partition.get(ids[i])!));
    }
    expect(partition.get(B)).toEqual('plugin-b');
  });

  test('recognises a boot module by its stripped id', ({ expect }) => {
    // Boot ids arrive query-stripped and the module list raw; a mismatch grouped boot modules twice.
    const partition = computeLazyPartition(makeGraph({ [`${A}?v=1`]: {}, [B]: {} }), new Set([A]), {
      entry: ENTRY,
      packageOf,
      log: silent,
    });

    expect(partition.has(A)).toBe(false);
    expect(partition.get(B)).toEqual('plugin-b');
  });

  test('absorbs what a group reaches into the earliest group that reaches it', ({ expect }) => {
    // `helper` is used by both packages; it goes to `plugin-b`, the dependency, so `plugin-a`
    // imports it from a chunk it already depends on and no edge points forwards.
    const helper = '/repo/node_modules/date-fns/addHours.mjs';
    const own = '/repo/node_modules/only-a/index.js';
    const partition = lazyPartitionOf({
      [A]: { imports: [B, helper, own] },
      [B]: { imports: [helper] },
    });

    expect(partition.get(helper)).toEqual('plugin-b');
    expect(partition.get(own)).toEqual('plugin-a');
  });

  test('groups only the page-side areas', ({ expect }) => {
    const mesh = '/repo/packages/core/echo/echo-host/src/index.ts';
    const partition = lazyPartitionOf({ [A]: {}, [mesh]: {} });

    expect(partition.get(A)).toEqual('plugin-a');
    expect(partition.has(mesh)).toBe(false);
  });

  test('leaves a lazy entry with a heavy exclusive closure to rolldown, welds a light one', ({ expect }) => {
    const light = '/repo/packages/plugins/plugin-a/src/capabilities/schema.ts';
    const heavy = '/repo/packages/plugins/plugin-a/src/containers/Editor.ts';
    const editorLib = '/repo/node_modules/typescript/lib/typescript.js';
    const partition = computeLazyPartition(
      makeGraph({
        [A]: { dynamicImports: [light, heavy] },
        [light]: { imports: [A2], bytes: 10 },
        [A2]: { bytes: 10 },
        [heavy]: { imports: [A2, editorLib], bytes: 10 },
        [editorLib]: { bytes: 5_000 },
      }),
      new Set(),
      { entry: ENTRY, packageOf, lazyEntryExclusiveBytes: 1_000, log: silent },
    );

    expect(partition.get(light)).toEqual('plugin-a');
    expect(partition.get(A2)).toEqual('plugin-a');
    expect(partition.has(heavy)).toBe(false);
    expect(partition.has(editorLib)).toBe(false);
  });

  test('leaves everything a worker script reaches alone, dynamic imports included', ({ expect }) => {
    const worker = '/repo/packages/apps/app/src/workers/data-worker.ts?worker_file&type=module';
    const helper = '/repo/node_modules/only-a/index.js';
    const partition = lazyPartitionOf({
      [worker]: { imports: [A], dynamicImports: [B] },
      [A]: { imports: [helper] },
      [A2]: { imports: [helper] },
      [B]: {},
      [C]: {},
    });

    expect(partition.has(A)).toBe(false);
    expect(partition.has(B)).toBe(false);
    expect(partition.has(helper)).toBe(false);
    expect(partition.get(A2)).toEqual('plugin-a');
    expect(partition.get(C)).toEqual('plugin-c');
  });

  test('is empty without module enumeration or when disabled', ({ expect }) => {
    const graph = makeGraph({ [A]: {} });
    expect(
      computeLazyPartition({ getModuleInfo: graph.getModuleInfo }, new Set(), { entry: ENTRY, log: silent }).size,
    ).toEqual(0);
    expect(computeLazyPartition(graph, new Set(), { entry: ENTRY, lazyTargetBytes: null, log: silent }).size).toEqual(
      0,
    );
  });
});

describe('bootChunking with lazy groups', () => {
  test('takes the module list from buildEnd when the chunking context has none', ({ expect }) => {
    const lazy = '/repo/packages/plugins/plugin-a/src/index.ts';
    const modules: Record<string, FakeModule> = {
      [ENTRY]: { imports: ['/repo/node_modules/a/index.js'] },
      '/repo/node_modules/a/index.js': {},
      [lazy]: {},
    };
    const { groupName, setModuleIds } = bootChunking({ entry: ENTRY, packageOf, log: silent });
    const chunkingCtx: ModuleGraph = { getModuleInfo: makeGraph(modules).getModuleInfo };

    setModuleIds(Object.keys(modules));
    expect(groupName(lazy, chunkingCtx)).toEqual('plugin-a');
    expect(groupName('/repo/node_modules/a/index.js', chunkingCtx)).toEqual('boot-0');
  });

  test('names boot modules first and lazy modules by package', ({ expect }) => {
    const lazy = '/repo/packages/plugins/plugin-a/src/index.ts';
    const { groupName } = bootChunking({ entry: ENTRY, packageOf, log: silent });
    const graph = makeGraph({
      [ENTRY]: { imports: ['/repo/node_modules/a/index.js'] },
      '/repo/node_modules/a/index.js': {},
      [lazy]: { imports: ['/repo/node_modules/a/index.js'] },
    });

    expect(groupName('/repo/node_modules/a/index.js', graph)).toEqual('boot-0');
    expect(groupName(lazy, graph)).toEqual('plugin-a');
    expect(groupName(ENTRY, graph)).toBeNull();
  });
});
