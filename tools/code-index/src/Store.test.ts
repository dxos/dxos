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
  'inPackage': Ontology.packageIri('@dxos/test').value,
  'imports': imports.map((target) => Ontology.fileIri(target).value),
  'importsType': [],
  'importsModule': ['effect'],
  'reexports': [],
  'declares': [
    {
      '@id': Ontology.symbolIri(path, 'thing').value,
      '@type': 'Symbol',
      'name': 'thing',
      'kind': 'variable',
      'exported': true,
      'line': 3,
      'extends': [],
      'constructedBy': [],
      'pipedThrough': [],
      'derivedFrom': [],
      'argument': [],
      'apiDependsOn': [],
      'implDependsOn': [],
      'aliasOf': [],
      'snippet': 'export const thing = 1;',
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
        yield* store.putDocument(document('src/a.ts', 1, ['src/b.ts']));
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
    await withStore((store) => store.putDocument(document('src/a.ts', 2, ['src/b.ts'])));

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

  test('reindexing at an unchanged mtime replaces rather than merges', async () => {
    // `--force` reindexes without the mtime moving, so the new graph IRI is the one being replaced.
    const revised: Ontology.FileDocument = { ...document('src/a.ts', 2), importsModule: ['revised'] };
    await withStore((store) => store.putDocument(revised));

    const quads = await withStore((store) =>
      store.match(undefined, undefined, undefined, Ontology.graphIri('src/a.ts', 2)),
    );
    const modules = quads.filter((quad) => quad.predicate.value === Ontology.importsModule.value);
    expect(modules.map((quad) => quad.object.value)).toEqual(['revised']);
    // The import edge of the previous write is gone, not merged in beside the new one.
    expect(quads.filter((quad) => quad.predicate.value === Ontology.imports.value)).toEqual([]);

    await withStore((store) => store.putDocument(document('src/a.ts', 2, ['src/b.ts'])));
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

  const REASONER = 'test';

  // A rule of the store's own, kept trivial — what to ship is `rules/example.n3`'s business.
  const RULES = `
    @prefix deus: <${Ontology.PREFIX}>.
    { ?a deus:imports ?b } => { ?a deus:importsTestFile ?b }.
  `;

  test('N3 rules derive new quads, optionally materialized', async () => {
    await withStore((store) => store.putDocument(document('src/a.ts', 3, ['src/b.ts'])));

    const derived = await withStore((store) => store.reason(REASONER, RULES));
    expect(derived.map((quad) => quad.predicate.value)).toContain(Ontology.importsTestFile.value);
    expect(await withStore((store) => store.match(undefined, Ontology.importsTestFile))).toHaveLength(0);

    await withStore((store) => store.reason(REASONER, RULES, { materialize: true }));
    const materialized = await withStore((store) => store.match(undefined, Ontology.importsTestFile));
    expect(materialized).toHaveLength(1);
    // Conclusions live in their own graph, apart from the file graphs they were derived from.
    expect(materialized[0].graph.value).toEqual(Ontology.derivedGraphIri(REASONER).value);
  });

  test('a derivation does not outlive the fact that entailed it', async () => {
    // The same file, reindexed without the import: the conclusion must go with its premise.
    await withStore((store) => store.putDocument(document('src/a.ts', 4)));
    expect(await withStore((store) => store.match(undefined, Ontology.imports))).toHaveLength(0);
    // Still there until the rules are rerun — materialized conclusions are only as fresh as the pass.
    expect(await withStore((store) => store.match(undefined, Ontology.importsTestFile))).toHaveLength(1);

    await withStore((store) => store.reason(REASONER, RULES, { materialize: true }));
    expect(await withStore((store) => store.match(undefined, Ontology.importsTestFile))).toHaveLength(0);
  });

  test('a reasoner never reads its own conclusions back', async () => {
    await withStore((store) => store.putDocument(document('src/a.ts', 5, ['src/b.ts'])));
    await withStore((store) => store.reason(REASONER, RULES, { materialize: true }));

    // A rule that would fire on this reasoner's own previous conclusion derives nothing: a reasoner
    // sees the file graphs and every *other* reasoner's output, never its own.
    const echo = `
      @prefix deus: <${Ontology.PREFIX}>.
      { ?a deus:importsTestFile ?b } => { ?a deus:importsModule "echoed" }.
    `;
    expect(await withStore((store) => store.reason(REASONER, echo))).toEqual([]);
    // Another reasoner does see it — that is how reasoners compose.
    expect(await withStore((store) => store.reason('downstream', echo))).toHaveLength(1);
  });

  test('a rule with an unbound predicate still sees the whole graph', async () => {
    // Narrowing premises by predicate is only sound when every rule names its predicates.
    const wildcard = `
      @prefix deus: <${Ontology.PREFIX}>.
      { ?a ?predicate "src/a.ts" } => { ?a deus:importsTestFile ?a }.
    `;
    const derived = await withStore((store) => store.reason(REASONER, wildcard));
    expect(derived).toHaveLength(1);
    expect(derived[0].subject.value).toEqual(Ontology.fileIri('src/a.ts').value);
  });

  test('a dotfile path survives serialization', async () => {
    // `.agents/x.ts` under a `file:` prefix would serialize as an illegal prefixed name; both the
    // dump and the reasoner's input have to stay parseable.
    await withStore((store) => store.putDocument(document('.agents/x.ts', 1, ['src/a.ts'])));
    expect(await withStore((store) => store.reason(REASONER, RULES, { materialize: true }))).toHaveLength(2);

    const dumped = await withStore((store) => store.dump());
    expect(dumped).toContain('.agents/x.ts');
    expect(await withStore((store) => store.load(dumped))).toBeGreaterThan(0);
    await withStore((store) => store.removeFile('.agents/x.ts'));
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
