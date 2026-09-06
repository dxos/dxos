//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as Crawler from './Crawler.ts';
import * as Indexer from './Indexer.ts';
import * as Ontology from './Ontology.ts';
import * as Store from './Store.ts';

const git = (root: string, ...args: string[]) => promisify(execFile)('git', args, { cwd: root });

describe('Indexer', () => {
  let root: string;
  let dir: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'code-index-repo-'));
    dir = join(root, 'node_modules', '.code-index');
    await mkdir(join(root, 'src'), { recursive: true });
    await mkdir(join(root, 'ignored'), { recursive: true });
    await writeFile(join(root, '.gitignore'), 'ignored/\n');
    await writeFile(join(root, 'src', 'a.ts'), "import { b } from './b';\nexport const a = b;\n");
    await writeFile(join(root, 'src', 'b.ts'), "import { c } from './c';\nexport const b = c;\n");
    await writeFile(join(root, 'src', 'c.ts'), "import * as Effect from 'effect';\nexport const c = Effect;\n");
    await writeFile(join(root, 'ignored', 'skip.ts'), 'export const skipped = 1;\n');
    await git(root, 'init', '--quiet');
  }, 60_000);

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  const withStore = <A, E>(f: (store: Store.Api) => Effect.Effect<A, E>): Promise<A> =>
    EffectEx.runPromise(Effect.scoped(Effect.provide(Effect.flatMap(Store.Store, f), Store.layer(dir))));

  // Deliberately not a closure: reachability over `deus:imports` is a query (`deus:imports+`),
  // never a materialized rule — see the header of `rules/example.n3`.
  const RULES = `
    @prefix deus: <${Ontology.PREFIX}>.
    { ?a deus:imports ?b } => { ?a deus:importsTestFile ?b }.
  `;

  const index = (options?: Partial<Indexer.Options>) =>
    EffectEx.runPromise(
      Effect.scoped(Effect.provide(Indexer.run({ root, workers: 1, rules: RULES, ...options }), Store.layer(dir))),
    );

  test('the crawler follows gitignore', async () => {
    const entries = await EffectEx.runPromise(Crawler.crawl(root));
    expect(entries.map(({ path }) => path)).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts']);
    expect(entries.every((entry) => entry.mtime > 0)).toBe(true);
  });

  test('the default store lives beside the repository dependencies', () => {
    expect(Crawler.storeDir('/repo')).toEqual(join('/repo', 'node_modules', '.code-index'));
  });

  test('a first pass indexes every crawled file', async () => {
    const result = await index();
    expect(result).toMatchObject({ scanned: 3, indexed: 3, unchanged: 0, removed: 0 });
    expect(result.skipped).toEqual([]);
    expect(result.timings.totalMs).toBeGreaterThan(0);
    expect(Object.values(result.timings).every((value) => typeof value === 'number')).toBe(true);

    const files = await withStore((store) => store.listFiles());
    expect(files.map(({ path }) => path)).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts']);
  }, 60_000);

  test('resolved imports are edges and bare specifiers stay module references', async () => {
    const edges = await withStore((store) =>
      store.select(`
        PREFIX deus: <${Ontology.PREFIX}>
        SELECT ?from ?to WHERE {
          GRAPH ?g { ?file deus:path ?from ; deus:imports ?target }
          GRAPH ?h { ?target deus:path ?to }
        } ORDER BY ?from
      `),
    );
    expect(edges).toEqual([
      { from: 'src/a.ts', to: 'src/b.ts' },
      { from: 'src/b.ts', to: 'src/c.ts' },
    ]);

    const modules = await withStore((store) => store.match(undefined, Ontology.importsModule));
    expect(modules.map((quad) => quad.object.value)).toEqual(['effect']);
  }, 60_000);

  test('a second pass reindexes only what changed', async () => {
    const unchanged = await index();
    expect(unchanged).toMatchObject({ scanned: 3, indexed: 0, unchanged: 3 });

    await writeFile(join(root, 'src', 'c.ts'), 'export const c = 2;\nexport const extra = 3;\n');
    const touched = new Date();
    await utimes(join(root, 'src', 'c.ts'), touched, touched);

    const second = await index();
    expect(second).toMatchObject({ scanned: 3, indexed: 1, unchanged: 2 });

    const symbols = await withStore((store) =>
      store.select(`
        PREFIX deus: <${Ontology.PREFIX}>
        SELECT ?name WHERE { GRAPH ?g { ?file deus:path "src/c.ts" ; deus:declares ?symbol . ?symbol deus:name ?name } }
        ORDER BY ?name
      `),
    );
    expect(symbols).toEqual([{ name: 'c' }, { name: 'extra' }]);
  }, 60_000);

  test('a deleted file loses its graph and its ledger row', async () => {
    await rm(join(root, 'src', 'c.ts'));
    const result = await index();
    expect(result).toMatchObject({ scanned: 2, removed: 1 });

    const files = await withStore((store) => store.listFiles());
    expect(files.map(({ path }) => path)).toEqual(['src/a.ts', 'src/b.ts']);
    expect(
      await withStore((store) => store.match(undefined, undefined, undefined, Ontology.graphIri('src/c.ts', 0))),
    ).toEqual([]);

    const orphaned = await withStore((store) =>
      store.select(`
        PREFIX deus: <${Ontology.PREFIX}>
        SELECT ?path WHERE { GRAPH ?g { ?file deus:path ?path } } ORDER BY ?path
      `),
    );
    expect(orphaned).toEqual([{ path: 'src/a.ts' }, { path: 'src/b.ts' }]);
  }, 60_000);

  test('--force reindexes everything', async () => {
    const result = await index({ force: true });
    expect(result).toMatchObject({ scanned: 2, indexed: 2, unchanged: 0 });
  }, 60_000);

  test('the pass closes by recomputing the derived graph', async () => {
    // Restore the file the deletion test removed; b's own graph still points at it, since b was
    // never dirtied by the deletion.
    await writeFile(join(root, 'src', 'c.ts'), "import * as Effect from 'effect';\nexport const c = Effect;\n");
    const result = await index({ force: true });
    // One conclusion per import edge: a -> b and b -> c.
    expect(result).toMatchObject({ derived: 2, reasoned: true });
    expect(result.timings.reasonMs).toBeGreaterThan(0);

    const derived = await withStore((store) =>
      store.match(undefined, Ontology.importsTestFile, undefined, Ontology.DERIVED_GRAPH),
    );
    expect(derived).toHaveLength(2);

    // Reachability stays a query: the property path walks the same edges without storing anything.
    const reachable = await withStore((store) =>
      store.select(`
        PREFIX deus: <${Ontology.PREFIX}>
        SELECT ?to WHERE { <${Ontology.fileIri('src/a.ts').value}> deus:imports+ ?target . ?target deus:path ?to }
        ORDER BY ?to
      `),
    );
    expect(reachable).toEqual([{ to: 'src/b.ts' }, { to: 'src/c.ts' }]);
  }, 60_000);

  test('an import removed from a file retracts what it entailed', async () => {
    await writeFile(join(root, 'src', 'b.ts'), 'export const b = 1;\n');
    const touched = new Date();
    await utimes(join(root, 'src', 'b.ts'), touched, touched);

    const result = await index();
    // b no longer imports c, so the conclusion drawn from that edge is gone with it.
    expect(result).toMatchObject({ indexed: 1, derived: 1 });

    const reachable = await withStore((store) =>
      store.select(`
        PREFIX deus: <${Ontology.PREFIX}>
        SELECT ?to WHERE { <${Ontology.fileIri('src/a.ts').value}> deus:imports+ ?target . ?target deus:path ?to }
        ORDER BY ?to
      `),
    );
    expect(reachable).toEqual([{ to: 'src/b.ts' }]);
  }, 60_000);

  test('a pass that changed nothing does not run the rules', async () => {
    const result = await index();
    expect(result).toMatchObject({ indexed: 0, removed: 0, reasoned: false });
    // The derived graph is reported as it stands, and left exactly as the previous pass built it.
    expect(result.derived).toEqual(1);
    expect(await withStore((store) => store.match(undefined, Ontology.importsTestFile))).toHaveLength(1);
  }, 60_000);

  test('--no-reason leaves the derived graph untouched', async () => {
    await writeFile(join(root, 'src', 'a.ts'), 'export const a = 1;\n');
    const touched = new Date();
    await utimes(join(root, 'src', 'a.ts'), touched, touched);

    const result = await index({ rules: undefined });
    expect(result).toMatchObject({ indexed: 1, reasoned: false, derived: 1 });
    // a no longer imports b, but nothing recomputed the conclusion that said it did.
    expect(await withStore((store) => store.match(undefined, Ontology.importsTestFile))).toHaveLength(1);
  }, 60_000);
});
