//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { DataFactory } from 'n3';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import * as Native from './internal/native.ts';
import { encodeDocument } from './internal/ntriples.ts';
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

  // A rule of the store's own, kept trivial — what to ship is `rules/50-example.n3`'s business.
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

  test('a path with brackets is stored as written', async () => {
    // Route segments such as `[id]` are legal in an IRI the index mints but not in strict N-Triples.
    await withStore((store) => store.putDocument(document('src/[id]/page.ts', 1)));
    const graph = Ontology.graphIri('src/[id]/page.ts', 1);
    expect((await withStore((store) => store.match(undefined, undefined, undefined, graph))).length).toBeGreaterThan(0);
    await withStore((store) => store.removeFile('src/[id]/page.ts'));
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

  test('an interrupted delete leaves no graph answering queries', async () => {
    // The failure this guards is a deleted file whose facts stay visible forever: `reconcile` scans
    // pending rows rather than the quad store, so a graph whose row went first is unfindable.
    await withStore((store) => store.putDocument(document('src/doomed.ts', 4)));
    const live = Ontology.graphIri('src/doomed.ts', 4);

    // Simulate a crash partway through `removeFile`: the graph is announced as pending but its
    // quads and its row are both still there.
    const database = new DatabaseSync(join(dir, 'index.sqlite'));
    database.prepare('UPDATE files SET pending_graph = ? WHERE path = ?').run(live.value, 'src/doomed.ts');
    database.close();

    expect(await withStore((store) => store.match(undefined, undefined, undefined, live))).toEqual([]);
    await withStore((store) => store.removeFile('src/doomed.ts'));
    expect(await withStore((store) => store.getFile('src/doomed.ts'))).toBeUndefined();
  });

  test('a store written under another ontology version is rebuilt on open', async () => {
    await withStore((store) => store.putDocument(document('src/legacy.ts', 1)));

    // A store from before the version was recorded has no row at all; the reset must treat that
    // the same as a mismatch, or old-scheme graphs would stay live beside new ones.
    const database = new DatabaseSync(join(dir, 'index.sqlite'));
    database.prepare('DELETE FROM meta').run();
    database.close();

    const [stats, version] = await withStore((store) => Effect.all([store.stats(), store.getMeta('ontologyVersion')]));
    expect(stats).toMatchObject({ files: 0, quads: 0 });
    expect(version).toEqual(String(Ontology.VERSION));

    // An up-to-date store is left alone.
    await withStore((store) => store.putDocument(document('src/kept.ts', 1)));
    expect(await withStore((store) => store.getFile('src/kept.ts'))).toBeDefined();
    await withStore((store) => store.removeFile('src/kept.ts'));
  });

  test('a batch commits every document in it', async () => {
    await withStore((store) =>
      store.putDocuments(
        [document('src/one.ts', 1), document('src/two.ts', 1), document('src/one.ts', 2)].map(encodeDocument),
      ),
    );
    const states = await withStore((store) => store.fileStates());
    // The later revision of a path in the same batch wins, and no graph is left pending.
    expect(states.filter(({ path }) => path === 'src/one.ts' || path === 'src/two.ts')).toMatchObject([
      { path: 'src/one.ts', mtime: 2, graph: Ontology.graphIri('src/one.ts', 2).value },
      { path: 'src/two.ts', mtime: 1, graph: Ontology.graphIri('src/two.ts', 1).value },
    ]);
    expect(
      await withStore((store) => store.match(undefined, undefined, undefined, Ontology.graphIri('src/one.ts', 1))),
    ).toEqual([]);
    expect(await withStore((store) => store.reconcile())).toEqual(0);
    await withStore((store) => Effect.andThen(store.removeFile('src/one.ts'), store.removeFile('src/two.ts')));
  });

  test('a batch interrupted between its swaps is reconciled file by file', async () => {
    await withStore((store) => store.putDocument(document('src/kept.ts', 1)));
    const next = Ontology.graphIri('src/kept.ts', 2);
    const fresh = Ontology.graphIri('src/fresh.ts', 1);

    // The batch announced both files, then swapped only the first before the process died. The
    // swap is written first here only because opening a store reconciles.
    await withStore((store) =>
      store.putQuads([DataFactory.quad(Ontology.fileIri('src/kept.ts'), Ontology.path, literal('src/kept.ts'), next)]),
    );
    const database = new DatabaseSync(join(dir, 'index.sqlite'));
    database.prepare('UPDATE files SET pending_graph = ? WHERE path = ?').run(next.value, 'src/kept.ts');
    database
      .prepare(
        'INSERT INTO files (path, language, size, hash, mtime, graph, pending_graph) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run('src/fresh.ts', 'typescript', 1, 'hash', 1, fresh.value, fresh.value);
    database.close();

    const [states, orphaned] = await withStore((store) =>
      Effect.all([store.fileStates(), store.match(undefined, undefined, undefined, next)]),
    );
    // The swapped file keeps its old row, so its unchanged mtime no longer matches and the next
    // pass reindexes it; the never-committed first write is forgotten entirely.
    expect(states.map(({ path, mtime }) => ({ path, mtime }))).toEqual([{ path: 'src/kept.ts', mtime: 1 }]);
    expect(orphaned).toEqual([]);
    await withStore((store) => store.removeFile('src/kept.ts'));
  });

  test('any write after reasoning marks the conclusions stale, across reopening', async () => {
    const reasoners = [{ name: REASONER, rules: RULES }];
    // What `Reasoner.run` does: note the generation, reason, record it.
    const reason = () =>
      withStore((store) =>
        Effect.gen(function* () {
          const generation = yield* store.generation();
          const derived = yield* store.reasonAll(reasoners);
          yield* store.recordReasoned(
            'rules',
            generation,
            derived.reduce((total, outcome) => total + outcome.derived, 0),
          );
        }),
      );
    const current = () => withStore((store) => Effect.map(store.reasoned('rules'), (derived) => derived !== undefined));

    await withStore((store) => store.putDocument(document('src/a.ts', 6, ['src/b.ts'])));
    expect(await current()).toBe(false);

    await reason();
    expect(await current()).toBe(true);
    expect(await withStore((store) => store.derivedCount())).toEqual(1);
    // The count the pass recorded, read back without counting.
    expect(await withStore((store) => store.reasoned('rules'))).toEqual(1);
    // Another rule set did not compute these graphs.
    expect(await withStore((store) => store.reasoned('other rules'))).toBeUndefined();

    await withStore((store) => store.putDocument(document('src/c.ts', 1)));
    expect(await current()).toBe(false);
    await reason();

    await withStore((store) => store.removeFile('src/c.ts'));
    expect(await current()).toBe(false);
    await reason();

    await withStore((store) =>
      store.putQuads([DataFactory.quad(namedNode('urn:b'), namedNode('urn:p'), literal('v'))]),
    );
    expect(await current()).toBe(false);
  });

  test('clear empties both databases', async () => {
    const stats = await withStore((store) => Effect.flatMap(store.clear(), () => store.stats()));
    expect(stats).toMatchObject({ files: 0, quads: 0 });
  });
});

describe('Store backend stamp', () => {
  const dirs: string[] = [];
  const fresh = async () => {
    const dir = await mkdtemp(join(tmpdir(), 'code-index-backend-'));
    dirs.push(dir);
    return dir;
  };

  afterAll(async () => {
    await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  });

  const open = <A, E>(
    dir: string,
    backend: Store.Backend | undefined,
    f: (store: Store.Api) => Effect.Effect<A, E>,
    options?: Store.LayerOptions,
  ): Promise<A> =>
    EffectEx.runPromise(
      Effect.scoped(Effect.provide(Effect.flatMap(Store.Store, f), Store.layer(dir, backend, options))),
    );

  /** Runs `body` with `CODE_INDEX_BACKEND` unset, so an open without a backend adopts the recorded one. */
  const withoutEnv = async <A>(body: () => Promise<A>): Promise<A> => {
    const saved = process.env.CODE_INDEX_BACKEND;
    delete process.env.CODE_INDEX_BACKEND;
    try {
      return await body();
    } finally {
      if (saved !== undefined) {
        process.env.CODE_INDEX_BACKEND = saved;
      }
    }
  };

  const writeAndMark = (dir: string) =>
    open(dir, 'js', (store) =>
      Effect.gen(function* () {
        yield* store.putDocument(document('src/a.ts', 1));
        yield* store.recordReasoned('rules', yield* store.generation(), 3);
      }),
    );

  test.skipIf(!Native.isAvailable())('switching backend resets the ledger and the reasoning mark', async () => {
    const dir = await fresh();
    await writeAndMark(dir);
    const [stats, backend, reasoned] = await open(dir, 'native', (store) =>
      Effect.all([store.stats(), store.getMeta('backend'), store.reasoned('rules')]),
    );
    expect(stats).toMatchObject({ files: 0, quads: 0 });
    expect(backend).toEqual('native');
    expect(reasoned).toBeUndefined();
  });

  test('a store without a recorded backend resets on the next write', async () => {
    const dir = await fresh();
    await writeAndMark(dir);
    const database = new DatabaseSync(join(dir, 'index.sqlite'));
    database.prepare('DELETE FROM meta WHERE key = ?').run('backend');
    database.close();

    const [stats, backend] = await open(dir, 'js', (store) => Effect.all([store.stats(), store.getMeta('backend')]));
    expect(stats).toMatchObject({ files: 0, quads: 0 });
    expect(backend).toEqual('js');
  });

  test('a reader refuses an explicit other backend and touches nothing', async () => {
    const dir = await fresh();
    await writeAndMark(dir);
    await expect(open(dir, 'native', (store) => store.stats(), { readOnly: true })).rejects.toThrow(
      /written by the js backend, not native; read it with CODE_INDEX_BACKEND=js/,
    );
    expect(existsSync(join(dir, Native.DIR))).toBe(false);
    const [file, reasoned] = await open(dir, 'js', (store) =>
      Effect.all([store.getFile('src/a.ts'), store.reasoned('rules')]),
    );
    expect(file).toBeDefined();
    expect(reasoned).toEqual(3);
  });

  test.skipIf(!Native.isAvailable())('a writer given no backend keeps the recorded one', async () => {
    const dir = await fresh();
    await open(dir, 'native', (store) => store.putDocument(document('src/a.ts', 1)));
    const [backend, files] = await withoutEnv(() =>
      open(dir, undefined, (store) => Effect.all([Effect.succeed(store.backend), store.listFiles()])),
    );
    expect(backend).toEqual('native');
    expect(files.map(({ path }) => path)).toEqual(['src/a.ts']);
  });

  test('a reader given no backend adopts the recorded one', async () => {
    const dir = await fresh();
    await writeAndMark(dir);
    const [backend, files] = await withoutEnv(() =>
      open(dir, undefined, (store) => Effect.all([Effect.succeed(store.backend), store.listFiles()]), {
        readOnly: true,
      }),
    );
    expect(backend).toEqual('js');
    expect(files.map(({ path }) => path)).toEqual(['src/a.ts']);
  });
});
