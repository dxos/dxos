//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { DataFactory } from 'n3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as Ontology from './Ontology.ts';
import * as Store from './Store.ts';

const { literal, namedNode } = DataFactory;

const document = (path: string, mtime: number, imports: string[] = []): Ontology.FileDocument => ({
  '@context': Ontology.CONTEXT,
  '@id': Ontology.fileIri(path).value,
  '@type': 'File',
  path,
  'language': 'typescript',
  'size': 10 + mtime,
  mtime,
  'hash': `hash-${path}-${mtime}`,
  'imports': imports.map((target) => Ontology.fileIri(target).value),
  'importsModule': ['effect'],
  'declares': [
    {
      '@id': Ontology.symbolIri(path, 'thing').value,
      '@type': 'Symbol',
      'name': 'thing',
      'kind': 'variable',
      'exported': true,
      'line': 3,
    },
  ],
});

describe('Store', () => {
  let dir: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'code-index-store-'));
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const withStore = <A, E>(f: (store: Store.Api) => Effect.Effect<A, E>): Promise<A> =>
    EffectEx.runPromise(Effect.scoped(Effect.provide(Effect.flatMap(Store.Store, f), Store.layer(dir))));

  test('a document lands in the file ledger and its own named graph', async () => {
    const [record, quads] = await withStore((store) =>
      Effect.gen(function* () {
        yield* store.putFileDocument(document('src/a.ts', 1, ['src/b.ts']));
        return [
          yield* store.getFile('src/a.ts'),
          yield* store.match(undefined, undefined, undefined, Ontology.graphIri('src/a.ts', 1)),
        ] as const;
      }),
    );

    expect(record).toMatchObject({ path: 'src/a.ts', language: 'typescript', mtime: 1, hash: 'hash-src/a.ts-1' });
    expect(quads.length).toBeGreaterThan(0);
    expect(quads.every((quad) => quad.graph.value === Ontology.graphIri('src/a.ts', 1).value)).toBe(true);
  });

  test('reindexing swaps the graph rather than accumulating revisions', async () => {
    const before = await withStore((store) => store.stats());
    await withStore((store) => store.putFileDocument(document('src/a.ts', 2, ['src/b.ts'])));

    const [state, stale, fresh, after] = await withStore((store) =>
      Effect.gen(function* () {
        const states = yield* store.fileStates();
        return [
          states.find(({ path }) => path === 'src/a.ts'),
          yield* store.match(undefined, undefined, undefined, Ontology.graphIri('src/a.ts', 1)),
          yield* store.match(undefined, undefined, undefined, Ontology.graphIri('src/a.ts', 2)),
          yield* store.stats(),
        ] as const;
      }),
    );

    expect(state?.mtime).toEqual(2);
    expect(state?.graph).toEqual(Ontology.graphIri('src/a.ts', 2).value);
    expect(stale).toHaveLength(0);
    expect(fresh.length).toBeGreaterThan(0);
    expect(after.quads).toEqual(before.quads);
  });

  test('the ledger survives reopening the store', async () => {
    expect(await withStore((store) => store.fileStates())).toHaveLength(1);
    const meta = await withStore((store) =>
      Effect.flatMap(store.setMeta('root', '/repo'), () => store.getMeta('root')),
    );
    expect(meta).toEqual('/repo');
    expect(await withStore((store) => store.getMeta('root'))).toEqual('/repo');
  });

  test('SPARQL sees the file graphs', async () => {
    const rows = await withStore((store) =>
      store.select(`
        PREFIX deus: <${Ontology.PREFIX}>
        SELECT ?path ?name WHERE { GRAPH ?g { ?file deus:path ?path ; deus:declares ?symbol . ?symbol deus:name ?name } }
      `),
    );
    expect(rows).toEqual([{ path: 'src/a.ts', name: 'thing' }]);

    expect(await withStore((store) => store.ask(`ASK { GRAPH ?g { ?s <${Ontology.path.value}> "src/a.ts" } }`))).toBe(
      true,
    );
  });

  test('LDkit lens returns typed entities', async () => {
    const files = await withStore((store) => Effect.promise(() => store.lens(Ontology.FileSchema).find()));
    expect(files).toHaveLength(1);
    expect(files[0].path).toEqual('src/a.ts');
    expect(files[0].size).toEqual(12);
    expect(files[0].imports).toEqual([Ontology.fileIri('src/b.ts').value]);
  });

  test('removing a file drops its graph and its row', async () => {
    await withStore((store) => store.removeFile('src/a.ts'));
    const stats = await withStore((store) => store.stats());
    expect(stats).toMatchObject({ files: 0, quads: 0 });
  });

  test('N3 rules derive new quads, optionally materialized', async () => {
    await withStore((store) => store.putFileDocument(document('src/a.ts', 3, ['src/b.ts'])));
    const rules = `
      @prefix deus: <${Ontology.PREFIX}>.
      { ?a deus:imports ?b } => { ?a deus:dependsOn ?b }.
    `;

    const derived = await withStore((store) => store.reason(rules));
    expect(derived.map((quad) => quad.predicate.value)).toContain(Ontology.dependsOn.value);
    expect(await withStore((store) => store.match(undefined, Ontology.dependsOn))).toHaveLength(0);

    await withStore((store) => store.reason(rules, { materialize: true }));
    // Derivations land in the default graph, so they survive a reindex of the file they came from.
    expect(await withStore((store) => store.match(undefined, Ontology.dependsOn))).toHaveLength(1);
  });

  test('dump serializes and load restores', async () => {
    const dumped = await withStore((store) => store.dump());
    expect(dumped).toContain('src/a.ts');

    const other = await mkdtemp(join(tmpdir(), 'code-index-store-'));
    const restored = await EffectEx.runPromise(
      Effect.scoped(
        Effect.provide(
          Effect.flatMap(Store.Store, (store) => Effect.flatMap(store.load(dumped), () => store.stats())),
          Store.layer(other),
        ),
      ),
    );
    expect(restored.quads).toBeGreaterThan(0);
    await rm(other, { recursive: true, force: true });
  });

  test('raw quads still round-trip', async () => {
    await withStore((store) =>
      store.putQuads([DataFactory.quad(namedNode('urn:a'), namedNode('urn:p'), literal('v'))]),
    );
    const matched = await withStore((store) => store.match(namedNode('urn:a')));
    expect(matched.map((quad) => quad.object.value)).toEqual(['v']);
  });

  test('an interrupted commit is reconciled when the store reopens', async () => {
    const orphan = Ontology.graphIri('src/z.ts', 9);
    await withStore((store) =>
      store.putQuads([DataFactory.quad(Ontology.fileIri('src/z.ts'), Ontology.path, literal('src/z.ts'), orphan)]),
    );

    // Simulate a crash between the graph write and the ledger update: the row still announces the
    // write it never finished.
    const database = new DatabaseSync(join(dir, 'index.sqlite'));
    database
      .prepare(
        'INSERT INTO files (path, language, size, hash, mtime, graph, pending_graph) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run('src/z.ts', 'typescript', 1, 'hash', 9, orphan.value, orphan.value);
    database.close();

    // Opening the store runs `reconcile`, which drops the announced-but-uncommitted graph.
    expect(await withStore((store) => store.match(undefined, undefined, undefined, orphan))).toEqual([]);
    expect(await withStore((store) => store.reconcile())).toEqual(0);
    await withStore((store) => store.removeFile('src/z.ts'));
  });

  test('clear empties both databases', async () => {
    const stats = await withStore((store) => Effect.flatMap(store.clear(), () => store.stats()));
    expect(stats).toMatchObject({ files: 0, quads: 0 });
  });
});
