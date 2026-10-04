//
// Copyright 2026 DXOS.org
//

import type * as RDF from '@rdfjs/types';
import * as Effect from 'effect/Effect';
import type * as Scope from 'effect/Scope';
import { type IQueryEngine, createLens } from 'ldkit';
import { DataFactory, Parser } from 'n3';
import { EventEmitter } from 'node:events';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as Ontology from '../Ontology.ts';
import * as Cooperative from './cooperative.ts';
import type { Binding, Graph } from './graph.ts';

/**
 * The native backend: oxigraph (RocksDB) for quads and SPARQL, and the incremental rule engine of
 * `tools/code-index-native`, loaded as a Node-API addon. Terms cross the boundary as N-Triples text.
 */

/** Where `moon run code-index-native:cargo-build` leaves the addon. */
export const ADDON_PATH = fileURLToPath(new URL('../../../code-index-native/code-index-native.node', import.meta.url));

/** The oxigraph and journal directories' parent inside a store. */
export const DIR = 'native';

type Outcome = {
  readonly graph: string;
  readonly derived: number;
  readonly added: number;
  readonly removed: number;
  readonly durationMs: number;
  readonly incremental: boolean;
};

/**
 * The addon's surface, as `src/binding.rs` declares it. Every call that touches the store runs on a
 * libuv thread: on a large store one can take seconds, and `serve` answers HTTP on this thread.
 */
interface NativeStore {
  putDocuments(writes: { graph: string; drop: string[]; triples: string }[]): Promise<number>;
  dropGraphs(graphs: string[]): Promise<void>;
  insertQuads(nquads: string): Promise<void>;
  removeQuads(nquads: string): Promise<void>;
  /** Six strings per quad; see `fromRows`. */
  match(
    subject?: string | null,
    predicate?: string | null,
    object?: string | null,
    graph?: string | null,
  ): Promise<string[]>;
  /** Rejects with a `cancelled` error once `cancel` is cancelled. */
  query(sparql: string, cancel: QueryCancel): Promise<{ kind: 'results' | 'quads'; body: string }>;
  reason(graph: string, rules: string, materialize: boolean): Promise<string>;
  reasonAll(strata: { graph: string; rules: string }[]): Promise<Outcome[]>;
  quadCount(): Promise<number>;
  graphLength(graph: string): Promise<number>;
  journalLength(): number;
  invalidate(): Promise<void>;
  clear(): Promise<void>;
  close(): void;
}

interface QueryCancel {
  cancel(): void;
}

interface Addon {
  NativeStore: { open(dir: string): NativeStore };
  QueryCancel: new () => QueryCancel;
}

export const isAvailable = (): boolean => existsSync(ADDON_PATH);

const load = (): Addon => createRequire(import.meta.url)(ADDON_PATH);

/** A term in N-Triples syntax; literal escapes follow JSON's, which N-Triples accepts. */
const toNTriples = (term: RDF.Term): string => {
  switch (term.termType) {
    case 'NamedNode':
      return `<${term.value}>`;
    case 'BlankNode':
      return `_:${term.value}`;
    case 'Literal': {
      const lexical = JSON.stringify(term.value);
      if (term.language) {
        return `${lexical}@${term.language}`;
      }
      return term.datatype.value === 'http://www.w3.org/2001/XMLSchema#string'
        ? lexical
        : `${lexical}^^<${term.datatype.value}>`;
    }
    case 'DefaultGraph':
      return 'DEFAULT';
    default:
      throw new TypeError(`Unsupported term type: ${term.termType}`);
  }
};

const toNQuads = (quads: readonly RDF.Quad[]): Effect.Effect<string> =>
  Effect.map(
    Cooperative.map(
      quads,
      (quad) =>
        `${toNTriples(quad.subject)} ${toNTriples(quad.predicate)} ${toNTriples(quad.object)}${
          quad.graph.termType === 'DefaultGraph' ? '' : ` ${toNTriples(quad.graph)}`
        } .\n`,
    ),
    (lines) => lines.join(''),
  );

const parseQuads = (text: string, format: 'N-Quads' | 'N-Triples'): RDF.Quad[] =>
  text.length === 0 ? [] : new Parser({ format }).parse(text);

const nodeOf = (value: string): RDF.NamedNode | RDF.BlankNode =>
  value.startsWith('_:') ? DataFactory.blankNode(value.slice(2)) : DataFactory.namedNode(value);

/**
 * `match`'s rows — subject, predicate, object kind (`I`, `B`, `L`), object value, the literal's
 * `@language` or datatype, graph — as quads: building terms from strings is several times faster
 * than parsing the same quads as N-Quads, which dominated every pass that reads a graph back.
 */
const fromRows = (rows: readonly string[]): Effect.Effect<RDF.Quad[]> =>
  Cooperative.map(rowStarts(rows.length), (index) => {
    const [subject, predicate, kind, value, extra, graph] = rows.slice(index, index + 6);
    const object: RDF.Quad_Object =
      kind === 'I'
        ? DataFactory.namedNode(value)
        : kind === 'B'
          ? DataFactory.blankNode(value)
          : DataFactory.literal(value, extra.startsWith('@') ? extra.slice(1) : DataFactory.namedNode(extra));
    return DataFactory.quad(
      nodeOf(subject),
      DataFactory.namedNode(predicate),
      object,
      graph.length === 0 ? DataFactory.defaultGraph() : nodeOf(graph),
    );
  });

function* rowStarts(length: number): Generator<number> {
  for (let index = 0; index + 5 < length; index += 6) {
    yield index;
  }
}

type JsonTerm =
  | { type: 'uri'; value: string }
  | { type: 'bnode'; value: string }
  | { 'type': 'literal'; 'value': string; 'datatype'?: string; 'xml:lang'?: string };

type JsonResults = { boolean?: boolean; results?: { bindings: Record<string, JsonTerm>[] } };

const fromJson = (term: JsonTerm): RDF.Term => {
  switch (term.type) {
    case 'uri':
      return DataFactory.namedNode(term.value);
    case 'bnode':
      return DataFactory.blankNode(term.value);
    case 'literal':
      return DataFactory.literal(
        term.value,
        term['xml:lang'] ?? (term.datatype ? DataFactory.namedNode(term.datatype) : undefined),
      );
  }
};

/** An immutable RDF/JS `Bindings` over SPARQL JSON results, for LDkit. */
class Row implements RDF.Bindings {
  readonly type = 'bindings';

  constructor(private readonly entries: ReadonlyMap<string, RDF.Term>) {}

  get size() {
    return this.entries.size;
  }

  has(key: RDF.Variable | string) {
    return this.entries.has(typeof key === 'string' ? key : key.value);
  }

  get(key: RDF.Variable | string) {
    return this.entries.get(typeof key === 'string' ? key : key.value);
  }

  set(key: RDF.Variable | string, value: RDF.Term) {
    return new Row(new Map(this.entries).set(typeof key === 'string' ? key : key.value, value));
  }

  delete(key: RDF.Variable | string) {
    const next = new Map(this.entries);
    next.delete(typeof key === 'string' ? key : key.value);
    return new Row(next);
  }

  *keys() {
    for (const key of this.entries.keys()) {
      yield DataFactory.variable(key);
    }
  }

  values() {
    return this.entries.values();
  }

  forEach(fn: (value: RDF.Term, key: RDF.Variable) => unknown) {
    this.entries.forEach((value, key) => fn(value, DataFactory.variable(key)));
  }

  *[Symbol.iterator](): Iterator<[RDF.Variable, RDF.Term]> {
    for (const [key, value] of this.entries) {
      yield [DataFactory.variable(key), value];
    }
  }

  equals(other: RDF.Bindings | null | undefined) {
    return (
      !!other && other.size === this.size && [...this.entries].every(([key, value]) => other.get(key)?.equals(value))
    );
  }

  filter(fn: (value: RDF.Term, key: RDF.Variable) => boolean) {
    return new Row(new Map([...this.entries].filter(([key, value]) => fn(value, DataFactory.variable(key)))));
  }

  map(fn: (value: RDF.Term, key: RDF.Variable) => RDF.Term) {
    return new Row(new Map([...this.entries].map(([key, value]) => [key, fn(value, DataFactory.variable(key))])));
  }

  merge(other: RDF.Bindings) {
    const next = new Map(this.entries);
    for (const [key, value] of other) {
      const current = next.get(key.value);
      if (current && !current.equals(value)) {
        return undefined;
      }
      next.set(key.value, value);
    }
    return new Row(next);
  }

  mergeWith(merger: (self: RDF.Term, other: RDF.Term, key: RDF.Variable) => RDF.Term, other: RDF.Bindings) {
    const next = new Map(this.entries);
    for (const [key, value] of other) {
      const current = next.get(key.value);
      next.set(key.value, current ? merger(current, value, key) : value);
    }
    return new Row(next);
  }
}

/** A finished result set as the RDF/JS `ResultStream` LDkit consumes (events plus `toArray`). */
class Results<T> extends EventEmitter implements RDF.ResultStream<T> {
  #index = 0;

  constructor(private readonly items: readonly T[]) {
    super();
    // Emitted on the next turn, after the consumer has attached its listeners.
    setImmediate(() => {
      for (const item of items) {
        this.emit('data', item);
      }
      this.emit('end');
    });
  }

  read(): T | null {
    return this.#index < this.items.length ? this.items[this.#index++] : null;
  }

  toArray(): Promise<T[]> {
    return Promise.resolve([...this.items]);
  }
}

export const make = <E>(
  dir: string,
  fail: (message: string) => (cause: unknown) => E,
): Effect.Effect<Graph<E>, E, Scope.Scope> =>
  Effect.gen(function* () {
    const attempt = <A>(message: string, thunk: () => A): Effect.Effect<A, E> =>
      Effect.try({ try: thunk, catch: fail(message) });
    const call = <A>(message: string, thunk: () => Promise<A>): Effect.Effect<A, E> =>
      Effect.tryPromise({ try: thunk, catch: fail(message) });

    if (!isAvailable()) {
      return yield* Effect.fail(
        fail('Native backend not built')(
          new Error(`No addon at ${ADDON_PATH}; run \`moon run code-index-native:cargo-build\`.`),
        ),
      );
    }
    const addon = load();
    // RocksDB holds a lock on its directory, so the store is closed with the scope rather than left
    // to the garbage collector — a reopen in the same process would otherwise fail.
    const native = yield* Effect.acquireRelease(
      attempt('Failed to open native store', () => addon.NativeStore.open(join(dir, DIR))),
      (store) => Effect.sync(() => store.close()),
    );

    const toRows = (parsed: JsonResults): Row[] =>
      (parsed.results?.bindings ?? []).map(
        (row) => new Row(new Map(Object.entries(row).map(([key, term]) => [key, fromJson(term)]))),
      );

    /**
     * A query on a libuv thread, cancelled when the fiber is interrupted (a timeout, a closed
     * client): oxigraph checks the token at every quad it reads, so an abandoned evaluation stops
     * within one read instead of holding a thread until it completes.
     */
    const query = (message: string, sparql: string): Effect.Effect<string, E> =>
      Effect.callback<string, E>((resume) => {
        const cancel = new addon.QueryCancel();
        native.query(sparql, cancel).then(
          (result) => resume(Effect.succeed(result.body)),
          (cause) => resume(Effect.fail(fail(message)(cause))),
        );
        return Effect.sync(() => cancel.cancel());
      });

    const decode = <A>(message: string, sparql: string, read: (body: string) => A): Effect.Effect<A, E> =>
      Effect.flatMap(query(message, sparql), (body) => attempt(`${message}: unreadable result`, () => read(body)));

    // LDkit's reads are not bounded by a caller, so they get a token nobody cancels.
    const unbounded = async (sparql: string) => (await native.query(sparql, new addon.QueryCancel())).body;

    const engine: IQueryEngine = {
      queryBindings: async (sparql) => new Results(toRows(JSON.parse(await unbounded(sparql)))),
      queryBoolean: async (sparql) => JSON.parse(await unbounded(sparql)).boolean === true,
      queryQuads: async (sparql) => new Results(parseQuads(await unbounded(sparql), 'N-Triples')),
      queryVoid: async () => {
        throw new Error('The code index is read-only through LDkit.');
      },
    };

    const graph: Graph<E> = {
      // Off the event loop: parsing of the next batches carries on while RocksDB writes this one.
      swap: (writes) =>
        Effect.tryPromise({
          try: () =>
            native.putDocuments(writes.map(({ clear, graph, triples }) => ({ graph, drop: [...clear], triples }))),
          catch: fail('Failed to write documents'),
        }).pipe(Effect.asVoid),

      drop: (name) => call('Failed to drop graph', () => native.dropGraphs([name])),

      putQuads: (quads) =>
        quads.length === 0
          ? Effect.void
          : Effect.flatMap(toNQuads(quads), (nquads) =>
              call('Failed to write quads', () => native.insertQuads(nquads)),
            ),

      delQuads: (quads) =>
        quads.length === 0
          ? Effect.void
          : Effect.flatMap(toNQuads(quads), (nquads) =>
              call('Failed to delete quads', () => native.removeQuads(nquads)),
            ),

      match: (subject, predicate, object, graphName) =>
        call('Failed to match quads', () =>
          native.match(
            subject && toNTriples(subject),
            predicate && toNTriples(predicate),
            object && toNTriples(object),
            graphName && toNTriples(graphName),
          ),
        ).pipe(Effect.flatMap(fromRows)),

      // A term's `value` is the JSON result's, so a binding needs no term built.
      select: (sparql) =>
        decode('Failed to run SPARQL SELECT', sparql, (body): JsonResults => JSON.parse(body)).pipe(
          Effect.flatMap((parsed) =>
            Cooperative.map(parsed.results?.bindings ?? [], (row): Binding =>
              Object.fromEntries(Object.entries(row).map(([key, term]) => [key, term.value])),
            ),
          ),
        ),

      ask: (sparql) =>
        decode('Failed to run SPARQL ASK', sparql, (body) => {
          const parsed: JsonResults = JSON.parse(body);
          return parsed.boolean === true;
        }),

      construct: (sparql) => decode('Failed to run SPARQL CONSTRUCT', sparql, (body) => parseQuads(body, 'N-Triples')),

      // LDkit insists on a source; the engine answers every query itself, so this one is a label.
      lens: (schema) => createLens(schema, { engine, sources: ['urn:code-index:native'] }),

      reason: (target, rules, materialize) =>
        call('Reasoning failed', () => native.reason(target.value, rules, materialize)).pipe(
          Effect.flatMap((nquads) => attempt('Reasoning failed', () => parseQuads(nquads, 'N-Quads'))),
        ),

      reasonAll: (reasoners) => {
        const byGraph = new Map(reasoners.map((reasoner) => [derivedGraph(reasoner.name), reasoner.name]));
        return call('Reasoning failed', () =>
          native.reasonAll(
            reasoners.map((reasoner) => ({ graph: derivedGraph(reasoner.name), rules: reasoner.rules })),
          ),
        ).pipe(
          Effect.map((outcomes) =>
            outcomes.map((outcome) => ({
              name: byGraph.get(outcome.graph) ?? outcome.graph,
              derived: outcome.derived,
              durationMs: outcome.durationMs,
              incremental: outcome.incremental,
            })),
          ),
        );
      },

      count: () => call('Failed to count quads', () => native.quadCount()),

      countGraph: (name) => call('Failed to count quads', () => native.graphLength(name)),

      clear: () => call('Failed to clear graph', () => native.clear()),
    };
    return graph;
  });

const derivedGraph = (name: string): string => Ontology.derivedGraphIri(name).value;
