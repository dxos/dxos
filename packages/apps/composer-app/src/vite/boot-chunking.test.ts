//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type ModuleGraph, bootChunking, computeBootPartition, toBootModuleId } from './boot-chunking.ts';

const ENTRY = '/repo/packages/apps/app/src/main.tsx';

type FakeModule = { imports?: string[]; bytes?: number };

/** A module graph shaped like rolldown's, built from an id -> imports/size map. */
const makeGraph = (modules: Record<string, FakeModule>): ModuleGraph => ({
  getModuleInfo: (moduleId) => {
    const module = modules[moduleId];
    return module ? { importedIds: module.imports ?? [], code: 'x'.repeat(module.bytes ?? 0) } : null;
  },
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
