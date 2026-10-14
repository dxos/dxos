//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as SqlClient from 'effect/sql/SqlClient';
import { DataFactory, type Quad } from 'n3';

import { SemanticIndexError } from '../errors.ts';
import { insertQuadsMemory, makeMemorySource } from '../internal/source/memory-source.ts';
import {
  type Row,
  insertQuads,
  loadGraphRows,
  makeSqliteSource,
  rowToQuad,
  selectChunked,
} from '../internal/source/sqlite-source.ts';
import type * as Engine from '../internal/sparql/engine.ts';
import { graphQuads, queryMemory } from '../internal/sparql/query-memory.ts';
import { querySqlite } from '../internal/sparql/query-sqlite.ts';
import { migrate } from '../internal/sqlite/schema.ts';
import { hashText } from '../internal/stages/reconcile.ts';
import { type Fact, Graph, Ontology } from '../types/index.ts';
import * as Mapping from '../types/Mapping.ts';
import * as Vocab from '../types/Vocab.ts';
import { FactStore, type FactStoreApi } from './fact-store.ts';

//
// Live implementations of {@link FactStore}. Kept separate from the tag so operation definitions
// (which reference the tag in `services:`) never pull the SPARQL/SQLite machinery into their
// import closure — see `@dxos/pipeline-rdf/fact-store`.
//

/**
 * The seed vocabulary every store starts with (and starts with again once cleared): `Ontology.DEFAULT` described in
 * the ontology graph, plus a marker naming its version, so a store written by an older seed is brought up to date.
 */
const SEED_QUADS = Ontology.ontologyQuads(Ontology.DEFAULT);
const SEED_IRIS = [...new Set(SEED_QUADS.map((quad) => quad.subject.value))];
const SEED_VERSION = hashText(
  SEED_QUADS.map((quad) => `${quad.subject.value} ${quad.predicate.value} ${quad.object.value}`).join('\n'),
);
const SEED_MARKER = DataFactory.quad(
  DataFactory.namedNode(Vocab.ONTOLOGY_GRAPH),
  DataFactory.namedNode(Vocab.SX_SEED),
  DataFactory.literal(SEED_VERSION),
);

/**
 * The quads persisting the facts, plus the provenance of each predicate they mint that the store has not described
 * yet, so a predicate records when, by what and from which quote it was first minted rather than every use.
 */
const factQuads = (facts: readonly Fact[], described: (iris: string[]) => ReadonlySet<string>): Quad[] => {
  const minted = Graph.mintedPredicates(facts);
  const known = described(minted.map(({ iri }) => iri));
  return [
    ...facts.flatMap((fact) => Mapping.factToTriples(fact)),
    ...minted.filter(({ iri }) => !known.has(iri)).flatMap(Ontology.toQuads),
  ];
};

// triplesToFacts validates via Schema and can throw a ParseError on malformed stored data.
const reassemble = (quads: Quad[]): Effect.Effect<Fact[], SemanticIndexError> =>
  Effect.try({
    try: () => Mapping.triplesToFacts(quads),
    catch: (cause) => new SemanticIndexError({ message: 'Failed to reassemble facts', cause }),
  });

// Raw SPARQL execution via Comunica, imported on first use: Comunica does not run in the browser or a
// Worker, so the persist and structured-query paths must not load it at all. The query names graphs; `load`
// fetches what is stored in them.
const makeSelect = (
  source: Parameters<typeof Engine.selectGraphs>[1],
  load: (graphs: string[]) => Effect.Effect<Quad[], SemanticIndexError>,
): FactStoreApi['select'] => {
  let engine: Promise<{ module: typeof Engine; engine: ReturnType<typeof Engine.makeEngine> }> | undefined;
  // A failed load is forgotten, so the next query retries instead of replaying the same rejection.
  const getEngine = () =>
    (engine ??= import('../internal/sparql/engine.ts')
      .then((module) => ({ module, engine: module.makeEngine() }))
      .catch((error: unknown) => {
        engine = undefined;
        throw error;
      }));
  return (sparql) =>
    Effect.tryPromise({
      try: getEngine,
      catch: (cause) => new SemanticIndexError({ message: 'Failed to load the SPARQL engine', cause }),
    }).pipe(
      Effect.flatMap(({ module, engine }) => module.selectGraphs(engine, source, sparql)),
      Effect.flatMap(load),
      Effect.flatMap(reassemble),
    );
};

export const layer: Layer.Layer<FactStore, never, SqlClient.SqlClient> = Layer.effect(
  FactStore,
  Effect.gen(function* () {
    const sql = yield* SqlClient.SqlClient;
    // Schema creation is a fatal store-construction failure (not a recoverable per-operation error), so die here.
    yield* migrate().pipe(Effect.orDie);
    const source = makeSqliteSource(sql);

    // A store whose seed is current holds the marker; one written by another seed has its seed predicates rewritten.
    const seed = Effect.gen(function* () {
      const [marker] = yield* sql<{ o: string }>`
        SELECT o FROM triples WHERE g = '' AND s = ${Vocab.ONTOLOGY_GRAPH} AND p = ${Vocab.SX_SEED}`;
      if (marker?.o === SEED_VERSION) {
        return;
      }
      yield* sql.withTransaction(
        Effect.gen(function* () {
          yield* sql`DELETE FROM triples WHERE g = ${Vocab.ONTOLOGY_GRAPH} AND ${sql.in('s', SEED_IRIS)}`;
          yield* sql`DELETE FROM triples WHERE g = '' AND s = ${Vocab.ONTOLOGY_GRAPH} AND p = ${Vocab.SX_SEED}`;
          yield* insertQuads(sql, [...SEED_QUADS, SEED_MARKER]);
        }),
      );
    });
    // Like the schema, a store that cannot be seeded is a construction failure.
    yield* seed.pipe(Effect.orDie);

    const putFacts: FactStoreApi['putFacts'] = (facts) =>
      Effect.gen(function* () {
        const iris = Graph.mintedPredicates(facts).map(({ iri }) => iri);
        const rows = yield* selectChunked(
          iris,
          (chunk) => sql<{ s: string }>`
            SELECT s FROM triples WHERE g = ${Vocab.ONTOLOGY_GRAPH} AND p = ${Vocab.RDF_TYPE}
              AND o = ${Vocab.RDF_PROPERTY} AND ${sql.in('s', chunk)}`,
        );
        const described = new Set(rows.map(({ s }) => s));
        yield* insertQuads(
          sql,
          factQuads(facts, () => described),
        );
      }).pipe(Effect.mapError((cause) => new SemanticIndexError({ message: 'Failed to persist facts', cause })));

    const predicates: FactStoreApi['predicates'] = () =>
      sql<Row>`SELECT s, p, o, oType, g FROM triples WHERE g = ${Vocab.ONTOLOGY_GRAPH}`.pipe(
        Effect.map((rows) => Ontology.fromQuads(rows.map(rowToQuad))),
        Effect.mapError((cause) => new SemanticIndexError({ message: 'Failed to read predicates', cause })),
      );

    const cursor: FactStoreApi['cursor'] = (src) =>
      sql<{ hash: string }>`SELECT hash FROM cursors WHERE source = ${src}`.pipe(
        Effect.map((rows) => rows[0]?.hash),
        Effect.mapError((cause) => new SemanticIndexError({ message: 'Failed to read cursor', cause })),
      );

    const setCursor: FactStoreApi['setCursor'] = (src, hash) =>
      sql`INSERT INTO cursors (source, hash) VALUES (${src}, ${hash})
          ON CONFLICT(source) DO UPDATE SET hash = ${hash}`.pipe(
        Effect.asVoid,
        Effect.mapError((cause) => new SemanticIndexError({ message: 'Failed to write cursor', cause })),
      );

    const clear: FactStoreApi['clear'] = () =>
      Effect.gen(function* () {
        yield* sql`DELETE FROM triples`;
        yield* sql`DELETE FROM entities`;
        yield* sql`DELETE FROM cursors`;
        yield* seed;
      }).pipe(
        Effect.asVoid,
        Effect.mapError((cause) => new SemanticIndexError({ message: 'Failed to clear store', cause })),
      );

    // Structured query runs directly over the `triples` table (no SPARQL engine), so the SQLite
    // path works everywhere (browser worker / node / CF DO) — Comunica does not bundle for browser
    // or Workers. `select` (raw SPARQL via Comunica) stays for node-only callers/tests.
    const query: FactStoreApi['query'] = (q) => querySqlite(sql, q);

    const load = (graphs: string[]): Effect.Effect<Quad[], SemanticIndexError> =>
      graphs.length === 0
        ? Effect.succeed([])
        : loadGraphRows(sql, graphs).pipe(
            Effect.map((rows) => rows.map(rowToQuad)),
            Effect.mapError((cause) => new SemanticIndexError({ message: 'Failed to load graphs', cause })),
          );

    return { putFacts, predicates, cursor, setCursor, query, select: makeSelect(source, load), clear };
  }),
);

/**
 * Builds a fresh in-memory FactStore service (no `SqlClient`). Shared by {@link layerMemory} and
 * callers that need a standalone instance without a Layer (e.g. a per-space registry).
 */
export const makeMemory = (): FactStoreApi => {
  const source = makeMemorySource();
  const cursors = new Map<string, string>();
  const seed = () => insertQuadsMemory(source, [...SEED_QUADS, SEED_MARKER]);
  seed();

  const ontologyGraph = DataFactory.namedNode(Vocab.ONTOLOGY_GRAPH);
  const putFacts: FactStoreApi['putFacts'] = (facts) =>
    Effect.try({
      try: () =>
        insertQuadsMemory(
          source,
          factQuads(
            facts,
            (iris) =>
              new Set(
                iris.filter(
                  (iri) =>
                    source.countQuads(
                      DataFactory.namedNode(iri),
                      DataFactory.namedNode(Vocab.RDF_TYPE),
                      DataFactory.namedNode(Vocab.RDF_PROPERTY),
                      ontologyGraph,
                    ) > 0,
                ),
              ),
          ),
        ),
      catch: (cause) => new SemanticIndexError({ message: 'Failed to persist facts', cause }),
    });

  const predicates: FactStoreApi['predicates'] = () =>
    Effect.sync(() => Ontology.fromQuads(source.getQuads(null, null, null, ontologyGraph)));

  const cursor: FactStoreApi['cursor'] = (src) => Effect.sync(() => cursors.get(src));
  const setCursor: FactStoreApi['setCursor'] = (src, hash) => Effect.sync(() => void cursors.set(src, hash));

  const query: FactStoreApi['query'] = (q) =>
    Effect.try({
      try: () => queryMemory(source, q),
      catch: (cause) => new SemanticIndexError({ message: 'Failed to query facts', cause }),
    });

  const clear: FactStoreApi['clear'] = () =>
    Effect.sync(() => {
      source.removeQuads(source.getQuads(null, null, null, null));
      cursors.clear();
      seed();
    });

  const load = (graphs: string[]) =>
    Effect.sync(() => [
      ...graphQuads(source, graphs),
      ...source.getQuads(null, null, null, DataFactory.namedNode(Vocab.ONTOLOGY_GRAPH)),
    ]);

  return { putFacts, predicates, cursor, setCursor, query, select: makeSelect(source, load), clear };
};

/**
 * Browser/test layer backed by an in-memory N3 store (no `SqlClient`, no SQLite). Structured queries
 * run directly over the store (no SPARQL engine), so the browser path avoids Comunica entirely;
 * `select` (raw SPARQL) still uses Comunica and so is server-side only.
 */
export const layerMemory: Layer.Layer<FactStore> = Layer.sync(FactStore, () => makeMemory());
