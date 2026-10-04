//
// Copyright 2026 DXOS.org
//

import * as Tool from 'effect/ai/Tool';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';

import { EffectEx } from '@dxos/effect';

import * as Ontology from '../Ontology.ts';
import * as Store from '../Store.ts';
import * as Summary from '../Summary.ts';
import { indexFixture, indexUsageFixture, writeFixture, writeUsageFixture } from './fixture.ts';
import * as Server from './Server.ts';
import * as Sparql from './Sparql.ts';

describe('mcp Server', () => {
  let root: string;
  let dir: string;
  let scope: Scope.Closeable;
  let store: Store.Api;
  let toolkit: Effect.Success<typeof Server.CodeIndexToolkit>;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'code-index-mcp-'));
    dir = join(root, 'node_modules', '.code-index');
    await writeFixture(root);
    await indexFixture(root, dir);
    scope = await EffectEx.runPromise(Scope.make());
    toolkit = await EffectEx.runPromise(
      Effect.gen(function* () {
        store = yield* Server.open(dir);
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

  test("a malformed query is a tool failure carrying the engine's message", async () => {
    const error = await failure(toolkit.handle('query', { sparql: 'SELECT WHERE {' }));
    expect(error).toBeInstanceOf(Server.ToolFailure);
    expect(error.message).toMatch(/^Failed to run SPARQL SELECT: \S/);
  });

  test('a query using a known prefix without declaring it gets the declaration', async () => {
    const result = await call(
      Server.Query.successSchema,
      toolkit.handle('query', { sparql: 'SELECT ?path WHERE { ?f a deus:File ; deus:path ?path } ORDER BY ?path' }),
    );
    expect(result.prefixesInjected).toEqual(['deus']);
    expect(result.rows).toHaveLength(5);
    expect(result.warnings).toBeUndefined();

    const declared = await call(
      Server.Query.successSchema,
      toolkit.handle('query', { sparql: `PREFIX deus: <${Ontology.PREFIX}> SELECT ?f WHERE { ?f a deus:File }` }),
    );
    expect(declared.prefixesInjected).toBeUndefined();
  });

  test('withPrefixes ignores prefixed names inside strings, IRIs and comments', () => {
    expect(Sparql.withPrefixes('SELECT * WHERE { ?s ?p "pkg:x" . ?s ?q <urn:file:y> } # rdfs:label').injected).toEqual(
      [],
    );
    const { sparql, injected } = Sparql.withPrefixes('ASK { ?s a deus:File ; deus:inPackage pkg:@test/fixture }');
    expect(injected).toEqual(['deus', 'pkg']);
    expect(sparql).toContain(`PREFIX pkg: <${Ontology.PACKAGE_BASE}>`);
  });

  test('an unknown deus: term is a warning naming the closest known terms', async () => {
    const result = await call(
      Server.Query.successSchema,
      toolkit.handle('query', { sparql: 'SELECT ?key WHERE { ?op deus:operationkey ?key }' }),
    );
    expect(result.rows).toEqual([]);
    expect(result.warnings).toEqual(['deus:operationkey is not in the vocabulary; did you mean deus:operationKey?']);

    const asked = await call(Server.Ask.successSchema, toolkit.handle('ask', { sparql: 'ASK { ?s deus:importz ?o }' }));
    expect(asked.warnings?.[0]).toContain('deus:imports');
    expect(Sparql.deusTerms(`SELECT * WHERE { ?s <${Ontology.PREFIX}pathh> ?o ; deus:name "deus:nope" }`)).toEqual([
      'name',
      'pathh',
    ]);
  });

  test('a query past its timeout is cancelled, and the server keeps answering', async () => {
    // The native evaluator stops at its next quad read, so a query that would never finish is safe to
    // abandon there. Comunica cannot be stopped mid-join, so the JS backend gets one that ends in a second.
    const expensive =
      Store.defaultBackend() === 'native'
        ? 'SELECT (COUNT(*) AS ?n) WHERE { ?a ?b ?c . ?d ?e ?f . ?g ?h ?i . ?j ?k ?l }'
        : 'SELECT (COUNT(*) AS ?n) WHERE { ?a ?b ?c . ?d ?e ?f . ?g deus:path ?h }';
    const started = Date.now();
    const error = await failure(toolkit.handle('query', { sparql: expensive, timeoutMs: 10 }));
    expect(error.message).toContain('timed out after 10 ms');
    expect(error.message).toContain('LIMIT');
    expect(Date.now() - started).toBeLessThan(5_000);

    const cheap = await call(
      Server.Query.successSchema,
      toolkit.handle('query', { sparql: 'SELECT ?path WHERE { ?f deus:path ?path }', timeoutMs: 10_000 }),
    );
    expect(cheap.rows).toHaveLength(5);
  });

  test('boundQuery caps a query at the engine', () => {
    expect(Sparql.boundQuery('SELECT * WHERE { ?s ?p ?o }', 11)).toBe('SELECT * WHERE { ?s ?p ?o }\nLIMIT 11');
    expect(Sparql.boundQuery('SELECT * WHERE { ?s ?p ?o } LIMIT 5000', 11)).toBe(
      'SELECT * WHERE { ?s ?p ?o } LIMIT 11',
    );
    expect(Sparql.boundQuery('SELECT * WHERE { ?s ?p ?o } LIMIT 3 OFFSET 2', 11)).toBe(
      'SELECT * WHERE { ?s ?p ?o } LIMIT 3 OFFSET 2',
    );
    expect(Sparql.boundQuery('SELECT * WHERE { ?s ?p ?o } OFFSET 2', 11)).toBe(
      'SELECT * WHERE { ?s ?p ?o } OFFSET 2\nLIMIT 11',
    );
    // A subquery's LIMIT is not the outer query's.
    expect(Sparql.boundQuery('SELECT * WHERE { { SELECT ?s WHERE { ?s ?p ?o } LIMIT 1 } }', 11)).toBe(
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

  test('vocabulary describes asserted, derived and absent terms, with the namespace prefixes', async () => {
    const { prefixes, terms } = await call(Server.Vocabulary.successSchema, toolkit.handle('vocabulary', {}));
    expect(prefixes).toMatchObject({ deus: Ontology.PREFIX, file: Ontology.FILE_BASE, pkg: Ontology.PACKAGE_BASE });
    expect(terms.find((term) => term.term === 'File')).toMatchObject({ kind: 'class', count: 5, documented: true });
    expect(terms.find((term) => term.term === 'imports')).toMatchObject({
      kind: 'property',
      count: 2,
      subjectClass: 'deus:File',
      range: 'deus:File',
      description: expect.stringContaining('runtime'),
    });
    expect(terms.find((term) => term.term === 'importsTestFile')).toMatchObject({ kind: 'property', count: 2 });
    // Documented but never stated here: listed, so an agent can tell "absent" from "does not exist".
    expect(terms.find((term) => term.term === 'EffectLayer')).toMatchObject({ kind: 'class', count: 0 });
  });

  test('vocabulary and stats read the summary the indexing pass recorded', async () => {
    const recorded = await EffectEx.runPromise(Summary.read(store));
    expect(recorded).toBeDefined();
    const { terms } = await call(Server.Vocabulary.successSchema, toolkit.handle('vocabulary', {}));
    for (const entry of recorded?.vocabulary ?? []) {
      expect(terms).toContainEqual(expect.objectContaining(entry));
    }
    const stats = await call(Server.Stats.successSchema, toolkit.handle('stats', {}));
    expect(stats).toMatchObject({ files: recorded?.files, quads: recorded?.quads });
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

  test('an ambiguous name lists ranked candidates instead of choosing one', async () => {
    const result = await call(Server.Describe.successSchema, toolkit.handle('describe', { target: 'a' }));
    expect(result.iri).toBeUndefined();
    // The package-public one first.
    expect(result.candidates.map((candidate) => candidate.iri)).toEqual([
      Ontology.symbolIri('src/d.ts', 'a').value,
      Ontology.symbolIri('src/a.ts', 'a').value,
    ]);
    expect(result.candidates[0]).toMatchObject({ matchedBy: 'name' });
    expect(result.candidates[0].types).toContain('deus:Symbol');
    expect(result).toMatchObject({ candidatesTotal: 2, truncated: { candidates: false } });
  });

  test('describe on no match returns the forms it accepts', async () => {
    const result = await call(Server.Describe.successSchema, toolkit.handle('describe', { target: 'no-such-thing' }));
    expect(result).toMatchObject({ candidates: [], outgoing: [], candidatesTotal: 0 });
    expect(result.hint).toContain('Accepted forms');
    expect(result.hint).toContain('Operation.make');
  });

  test.each([
    ['Ns.c', 'src/c.ts', 'c', 'canonicalName'],
    ['org.test.operation.c', 'src/c.ts', 'c', 'operationKey'],
    ['org.test.type.b', 'src/b.ts', 'b', 'echoTypename'],
    ['org.test.plugin.b', 'src/b.ts', 'b', 'pluginId'],
    ['src/c.ts#c', 'src/c.ts', 'c', 'symbol'],
    ['Other.c', 'src/c.ts', 'c', 'partial:name'],
  ])('describe resolves %s', async (target, path, name, resolvedBy) => {
    const result = await call(Server.Describe.successSchema, toolkit.handle('describe', { target }));
    expect(result).toMatchObject({ iri: Ontology.symbolIri(path, name).value, resolvedBy });
  });

  test('describe resolves a path tail and a module member as imported', async () => {
    const tail = await call(Server.Describe.successSchema, toolkit.handle('describe', { target: 'b.ts' }));
    expect(tail).toMatchObject({ iri: Ontology.fileIri('src/b.ts').value, resolvedBy: 'partial:path' });

    const member = await call(Server.Describe.successSchema, toolkit.handle('describe', { target: 'effect#succeed' }));
    expect(member).toMatchObject({ iri: Ontology.memberIri('effect', 'succeed').value, resolvedBy: 'member' });
    expect(member.incoming).toContainEqual({
      subject: Ontology.symbolIri('src/c.ts', 'c').value,
      predicate: 'deus:implDependsOn',
    });
  });

  test('describe counts incoming triples per predicate and spreads the capped list across them', async () => {
    const result = await call(
      Server.Describe.successSchema,
      toolkit.handle('describe', { target: 'src/c.ts', limit: 2 }),
    );
    expect(result.incomingCounts).toEqual(
      expect.arrayContaining([
        { predicate: 'deus:imports', count: 1 },
        { predicate: 'deus:importsTestFile', count: 1 },
      ]),
    );
    expect(new Set(result.incoming.map((edge) => edge.predicate))).toEqual(
      new Set(['deus:imports', 'deus:importsTestFile']),
    );
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
    expect(stats.derived).toContainEqual({ graph: Ontology.derivedGraphIri('names').value, quads: 5 });
  });

  test('design returns the pruned graph and a mermaid draft, scored by baseline without a key', async () => {
    // Tests never call System One or Anthropic; without keys the tool walks and scores by text and degree.
    vi.stubEnv('TYPESAFE_API_KEY', '');
    vi.stubEnv('DX_ANTHROPIC_API_KEY', '');
    vi.stubEnv('ANTHROPIC_API_KEY', '');
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

describe('mcp usages', () => {
  let root: string;
  let scope: Scope.Closeable;
  let toolkit: Effect.Success<typeof Server.CodeIndexToolkit>;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'code-index-usages-'));
    const dir = join(root, 'node_modules', '.code-index');
    await writeUsageFixture(root);
    await indexUsageFixture(root, dir);
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

  const usages = (parameters: Tool.Parameters<typeof Server.Usages>) =>
    EffectEx.runPromise(
      Effect.flatMap(toolkit.handle('usages', parameters), Stream.runCollect).pipe(
        Effect.flatMap((results) =>
          Schema.decodeUnknownEffect(Server.Usages.successSchema)(results[results.length - 1].result),
        ),
      ),
    );

  const LEGACY = 'packages/lib/src/impl.ts#legacy';

  test('uses through a star barrel, an alias and a relative import are grouped by package and role', async () => {
    const result = await usages({ symbol: LEGACY });
    expect(result.declaration).toBe(Ontology.symbolIri('packages/lib/src/impl.ts', 'legacy').value);
    expect(result.packages).toEqual([
      {
        package: '@test/app',
        counts: { impl: 1, test: 2, story: 1 },
        files: [
          // From a top-level `describe(…)`, carried by the file's top-level symbol.
          { path: 'packages/app/src/suite.test.ts', role: 'test', symbols: [Ontology.TOP_LEVEL], via: 'barrel' },
          // Through the alias `old`.
          { path: 'packages/app/src/use.stories.tsx', role: 'story', symbols: ['Story'], via: 'barrel' },
          { path: 'packages/app/src/use.test.ts', role: 'test', symbols: ['tested'], via: 'barrel' },
          // One symbol per use, however many twins of the import it depends on.
          { path: 'packages/app/src/use.ts', role: 'impl', symbols: ['typed', 'usesLegacy'], via: 'barrel' },
        ],
      },
      {
        package: '@test/lib',
        counts: { impl: 1, test: 0, story: 0 },
        files: [{ path: 'packages/lib/src/direct.ts', role: 'impl', symbols: ['local'], via: 'direct' }],
      },
    ]);
    expect(result.reexportedBy).toEqual(['packages/lib/src/index.ts']);
    expect(result.total).toEqual({ symbols: 6, files: 5, packages: 2, impl: 2, test: 2, story: 1 });
    expect(result.truncated).toBe(false);
  });

  test('kind and includeTests narrow the uses, and the totals follow', async () => {
    const api = await usages({ symbol: LEGACY, kind: 'api' });
    // Only `typed` names it in a signature.
    expect(api.packages.flatMap((group) => group.files)).toEqual([
      { path: 'packages/app/src/use.ts', role: 'impl', symbols: ['typed'], via: 'barrel' },
    ]);
    const noTests = await usages({ symbol: LEGACY, includeTests: false });
    expect(noTests.total).toMatchObject({ test: 0 });
    const capped = await usages({ symbol: LEGACY, limit: 1 });
    expect(capped.truncated).toBe(true);
    expect(capped.total.files).toBe((await usages({ symbol: LEGACY })).total.files);
  });

  test('a namespace member is found through export * as N', async () => {
    const result = await usages({ symbol: 'packages/lib/src/order.ts#natural' });
    expect(result.packages.flatMap((group) => group.files)).toEqual([]);
  });

  test('a class merged with a namespace is found through a star barrel', async () => {
    const result = await usages({ symbol: 'packages/lib/src/service.ts#Service' });
    expect(result.packages.flatMap((group) => group.files)).toEqual([
      { path: 'packages/app/src/service-user.ts', role: 'impl', symbols: ['usesService'], via: 'barrel' },
      // The namespace half constructs the class half.
      { path: 'packages/lib/src/service.ts', role: 'impl', symbols: ['Service.make'], via: 'direct' },
    ]);
  });

  test('an alias is followed to its declaration, and an ambiguous name lists candidates', async () => {
    const alias = await usages({ symbol: 'packages/lib/src/index.ts#old' });
    expect(alias.declaration).toBe(Ontology.symbolIri('packages/lib/src/impl.ts', 'legacy').value);
    const ambiguous = await usages({ symbol: 'legacy' });
    expect(ambiguous.declaration).toBeUndefined();
    expect(ambiguous.candidates.map((candidate) => candidate.iri).sort()).toEqual([
      Ontology.symbolIri('packages/app/src/other.ts', 'legacy').value,
      Ontology.symbolIri('packages/lib/src/impl.ts', 'legacy').value,
    ]);
    const missing = await usages({ symbol: 'no-such-thing' });
    expect(missing.hint).toContain('Accepted forms');
  });
});
