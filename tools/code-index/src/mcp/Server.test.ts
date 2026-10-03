//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import * as EffectEx from '@dxos/effect/EffectEx';

import * as Ontology from '../Ontology.ts';
import * as Store from '../Store.ts';
import { indexFixture, writeFixture } from './fixture.ts';
import * as Server from './Server.ts';

describe('mcp Server', () => {
  let root: string;
  let dir: string;
  let scope: Scope.Closeable;
  let toolkit: Effect.Success<typeof Server.CodeIndexToolkit>;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'code-index-mcp-'));
    dir = join(root, 'node_modules', '.code-index');
    await writeFixture(root);
    await indexFixture(root, dir);
    scope = await EffectEx.runPromise(Scope.make());
    toolkit = await EffectEx.runPromise(
      Effect.gen(function* () {
        const store = yield* Server.open(dir);
        return yield* Effect.provide(Server.CodeIndexToolkit, Server.CodeIndexToolkit.toLayer(Server.handlers(store)));
      }).pipe(Scope.provide(scope)),
    );
  }, 60_000);

  afterAll(async () => {
    await EffectEx.runPromise(Scope.close(scope, Exit.void));
    await rm(root, { recursive: true, force: true });
  });

  /**
   * The last result a tool streams is its answer, decoded through the tool's own success schema:
   * the handled stream types it as any of the tool's outcomes, and this both narrows and checks it.
   */
  const call = <A, I, E>(
    success: Schema.Codec<A, I>,
    handled: Effect.Effect<Stream.Stream<{ readonly result: unknown }, E>, E>,
  ): Promise<A> =>
    EffectEx.runPromise(
      Effect.flatMap(handled, Stream.runCollect).pipe(
        Effect.flatMap((results) => Schema.decodeUnknownEffect(success)(results[results.length - 1].result)),
      ),
    );

  const failure = <A, E>(handled: Effect.Effect<Stream.Stream<A, E>, E>): Promise<E> =>
    EffectEx.runPromise(Effect.flip(Effect.flatMap(handled, Stream.runCollect)));

  test('query returns vars and rows, and reports truncation', async () => {
    const sparql = `PREFIX deus: <${Ontology.PREFIX}>
      SELECT ?path WHERE { ?file a deus:File ; deus:path ?path } ORDER BY ?path`;
    const all = await call(Server.Query.successSchema, toolkit.handle('query', { sparql }));
    expect(all).toMatchObject({ vars: ['path'], truncated: false, limit: Server.QUERY_DEFAULT_LIMIT });
    expect(all.rows.map((row) => row.path)).toEqual(['package.json', 'src/a.ts', 'src/b.ts', 'src/c.ts', 'src/d.ts']);

    const page = await call(Server.Query.successSchema, toolkit.handle('query', { sparql, limit: 2 }));
    expect(page).toMatchObject({ limit: 2, truncated: true });
    expect(page.rows).toHaveLength(2);

    // A LIMIT the query states itself is honoured, and is not mistaken for truncation.
    const own = await call(Server.Query.successSchema, toolkit.handle('query', { sparql: `${sparql} LIMIT 1` }));
    expect(own).toMatchObject({ truncated: false });
    expect(own.rows).toHaveLength(1);
  });

  test('a malformed query is a tool failure carrying the message', async () => {
    const error = await failure(toolkit.handle('query', { sparql: 'SELECT WHERE {' }));
    expect(error).toBeInstanceOf(Server.ToolFailure);
  });

  test('boundQuery caps a query at the engine', () => {
    expect(Server.boundQuery('SELECT * WHERE { ?s ?p ?o }', 11)).toBe('SELECT * WHERE { ?s ?p ?o }\nLIMIT 11');
    expect(Server.boundQuery('SELECT * WHERE { ?s ?p ?o } LIMIT 5000', 11)).toBe(
      'SELECT * WHERE { ?s ?p ?o } LIMIT 11',
    );
    expect(Server.boundQuery('SELECT * WHERE { ?s ?p ?o } LIMIT 3 OFFSET 2', 11)).toBe(
      'SELECT * WHERE { ?s ?p ?o } LIMIT 3 OFFSET 2',
    );
    expect(Server.boundQuery('SELECT * WHERE { ?s ?p ?o } OFFSET 2', 11)).toBe(
      'SELECT * WHERE { ?s ?p ?o } OFFSET 2\nLIMIT 11',
    );
    // A subquery's LIMIT is not the outer query's.
    expect(Server.boundQuery('SELECT * WHERE { { SELECT ?s WHERE { ?s ?p ?o } LIMIT 1 } }', 11)).toBe(
      'SELECT * WHERE { { SELECT ?s WHERE { ?s ?p ?o } LIMIT 1 } }\nLIMIT 11',
    );
  });

  test('ask answers a boolean', async () => {
    const edge = (from: string, to: string) =>
      `PREFIX deus: <${Ontology.PREFIX}> ASK { <${Ontology.fileIri(from).value}> deus:imports <${Ontology.fileIri(to).value}> }`;
    expect(
      await call(Server.Ask.successSchema, toolkit.handle('ask', { sparql: edge('src/a.ts', 'src/b.ts') })),
    ).toEqual({ result: true });
    expect(
      await call(Server.Ask.successSchema, toolkit.handle('ask', { sparql: edge('src/b.ts', 'src/a.ts') })),
    ).toEqual({ result: false });
  });

  test('vocabulary lists asserted and derived terms with the namespace prefixes', async () => {
    const { prefixes, terms } = await call(Server.Vocabulary.successSchema, toolkit.handle('vocabulary', {}));
    expect(prefixes).toMatchObject({ deus: Ontology.PREFIX, file: Ontology.FILE_BASE, pkg: Ontology.PACKAGE_BASE });
    expect(terms).toContainEqual({ term: 'File', kind: 'class', count: 5 });
    expect(terms.find((term) => term.term === 'imports')).toMatchObject({ kind: 'property', count: 2 });
    expect(terms.find((term) => term.term === 'importsTestFile')).toMatchObject({ kind: 'property', count: 2 });
  });

  test('describe resolves a path and shows both directions', async () => {
    const result = await call(Server.Describe.successSchema, toolkit.handle('describe', { target: 'src/b.ts' }));
    expect(result.iri).toBe(Ontology.fileIri('src/b.ts').value);
    expect(result.outgoing).toContainEqual({
      predicate: 'deus:imports',
      object: Ontology.fileIri('src/c.ts').value,
      objectKind: 'iri',
    });
    expect(result.outgoing).toContainEqual({ predicate: 'deus:path', object: 'src/b.ts', objectKind: 'literal' });
    expect(result.incoming).toContainEqual({ subject: Ontology.fileIri('src/a.ts').value, predicate: 'deus:imports' });

    const bounded = await call(
      Server.Describe.successSchema,
      toolkit.handle('describe', { target: `<${Ontology.fileIri('src/b.ts').value}>`, limit: 1 }),
    );
    expect(bounded.outgoing).toHaveLength(1);
    expect(bounded.truncated.outgoing).toBe(true);
  });

  test('describe resolves package names and prefixed IRIs', async () => {
    const byName = await call(Server.Describe.successSchema, toolkit.handle('describe', { target: '@test/fixture' }));
    const byPrefix = await call(
      Server.Describe.successSchema,
      toolkit.handle('describe', { target: 'pkg:@test/fixture' }),
    );
    expect(byName.iri).toBe(Ontology.packageIri('@test/fixture').value);
    expect(byPrefix.iri).toBe(byName.iri);
    expect(byName.outgoing).toContainEqual({ predicate: 'rdf:type', object: 'deus:Package', objectKind: 'iri' });
  });

  test('an ambiguous name lists candidates instead of choosing one', async () => {
    const result = await call(Server.Describe.successSchema, toolkit.handle('describe', { target: 'a' }));
    expect(result.iri).toBeUndefined();
    expect(result.candidates.map((candidate) => candidate.iri)).toEqual([
      Ontology.symbolIri('src/a.ts', 'a').value,
      Ontology.symbolIri('src/d.ts', 'a').value,
    ]);
    expect(result.candidates[0].types).toContain('deus:Symbol');

    expect(
      await call(Server.Describe.successSchema, toolkit.handle('describe', { target: 'no-such-thing' })),
    ).toMatchObject({ candidates: [], outgoing: [] });
  });

  test('files filters by prefix and language', async () => {
    const typescript = await call(Server.Files.successSchema, toolkit.handle('files', { language: 'typescript' }));
    expect(typescript.files.map((file) => file.path)).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts', 'src/d.ts']);
    const page = await call(Server.Files.successSchema, toolkit.handle('files', { prefix: 'src/', limit: 1 }));
    expect(page).toMatchObject({ total: 4, truncated: true, files: [{ path: 'src/a.ts', language: 'typescript' }] });
  });

  test('stats counts files, quads and derived graphs', async () => {
    const stats = await call(Server.Stats.successSchema, toolkit.handle('stats', {}));
    expect(stats).toMatchObject({ backend: Store.defaultBackend(), dir, files: 5 });
    expect(stats.quads).toBeGreaterThan(0);
    expect(stats.derived).toContainEqual({ graph: Ontology.derivedGraphIri('test').value, quads: 2 });
  });

  test('design returns the pruned graph and a mermaid draft, scored by baseline without a key', async () => {
    // Tests never call System One; without a key the tool scores by text and degree alone.
    vi.stubEnv('TYPESAFE_API_KEY', '');
    try {
      const result = await call(
        Server.DesignTool.successSchema,
        toolkit.handle('design', { prompt: 'what lives in src?', threshold: 0 }),
      );
      expect(result.scorer).toBe('baseline');
      expect(result.nodes.map((node) => node.path).sort()).toEqual(['src/a.ts', 'src/b.ts', 'src/c.ts', 'src/d.ts']);
      expect(result.edges).toContainEqual({
        from: Ontology.fileIri('src/a.ts').value,
        to: Ontology.fileIri('src/b.ts').value,
        kind: 'imports',
      });
      expect(result.mermaid).toContain('%% ref');
    } finally {
      vi.unstubAllEnvs();
    }
  });

  test('a missing store fails with a hint rather than creating one', async () => {
    const empty = await mkdtemp(join(tmpdir(), 'code-index-mcp-empty-'));
    try {
      const error = await EffectEx.runPromise(Effect.flip(Effect.scoped(Server.open(join(empty, 'store')))));
      expect(error.message).toContain('code-index index');
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  });
});
