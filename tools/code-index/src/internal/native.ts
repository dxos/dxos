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

/** The addon's surface, as `src/binding.rs` declares it. */
interface NativeStore {
  putDocument(graph: string, drop: string[], jsonLd: string): number;
  dropGraphs(graphs: string[]): void;
  insertQuads(nquads: string): void;
  removeQuads(nquads: string): void;
  match(subject?: string | null, predicate?: string | null, object?: string | null, graph?: string | null): string;
  query(sparql: string): { kind: 'results' | 'quads'; body: string };
  reason(graph: string, rules: string, materialize: boolean): string;
  reasonAll(strata: { graph: string; rules: string }[]): Outcome[];
  quadCount(): number;
  graphLength(graph: string): number;
  journalLength(): number;
  invalidate(): void;
  clear(): void;
  close(): void;
}

interface Addon {
  NativeStore: { open(dir: string): NativeStore };
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

const toNQuads = (quads: readonly RDF.Quad[]): string =>
  quads
    .map(
      (quad) =>
        `${toNTriples(quad.subject)} ${toNTriples(quad.predicate)} ${toNTriples(quad.object)}${
          quad.graph.termType === 'DefaultGraph' ? '' : ` ${toNTriples(quad.graph)}`
        } .\n`,
    )
    .join('');

const parseQuads = (text: string, format: 'N-Quads' | 'N-Triples'): RDF.Quad[] =>
  text.length === 0 ? [] : new Parser({ format }).parse(text);

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

    if (!isAvailable()) {
      return yield* Effect.fail(
        fail('Native backend not built')(
          new Error(`No addon at ${ADDON_PATH}; run \`moon run code-index-native:cargo-build\`.`),
        ),
      );
    }
    // RocksDB holds a lock on its directory, so the store is closed with the scope rather than left
    // to the garbage collector — a reopen in the same process would otherwise fail.
    const native = yield* Effect.acquireRelease(
      attempt('Failed to open native store', () => load().NativeStore.open(join(dir, DIR))),
      (store) => Effect.sync(() => store.close()),
    );

    const query = (sparql: string) => native.query(sparql);
    const results = (sparql: string): JsonResults => JSON.parse(query(sparql).body);
    const rows = (sparql: string): Row[] =>
      (results(sparql).results?.bindings ?? []).map(
        (row) => new Row(new Map(Object.entries(row).map(([key, term]) => [key, fromJson(term)]))),
      );
    const quadsOf = (sparql: string): RDF.Quad[] => parseQuads(query(sparql).body, 'N-Triples');

    const engine: IQueryEngine = {
      queryBindings: async (sparql) => new Results(rows(sparql)),
      queryBoolean: async (sparql) => results(sparql).boolean === true,
      queryQuads: async (sparql) => new Results(quadsOf(sparql)),
      queryVoid: async () => {
        throw new Error('The code index is read-only through LDkit.');
      },
    };

    const graph: Graph<E> = {
      swap: (clear, target, document: Ontology.FileDocument) =>
        attempt('Failed to write document', () => {
          native.putDocument(target.value, [...clear], JSON.stringify(document));
        }),

      drop: (name) => attempt('Failed to drop graph', () => native.dropGraphs([name])),

      putQuads: (quads) =>
        quads.length === 0 ? Effect.void : attempt('Failed to write quads', () => native.insertQuads(toNQuads(quads))),

      delQuads: (quads) =>
        quads.length === 0 ? Effect.void : attempt('Failed to delete quads', () => native.removeQuads(toNQuads(quads))),

      match: (subject, predicate, object, graphName) =>
        attempt('Failed to match quads', () =>
          parseQuads(
            native.match(
              subject && toNTriples(subject),
              predicate && toNTriples(predicate),
              object && toNTriples(object),
              graphName && toNTriples(graphName),
            ),
            'N-Quads',
          ),
        ),

      select: (sparql) =>
        attempt('Failed to run SPARQL SELECT', (): Binding[] =>
          rows(sparql).map((row) => Object.fromEntries([...row].map(([key, term]) => [key.value, term.value]))),
        ),

      ask: (sparql) => attempt('Failed to run SPARQL ASK', () => results(sparql).boolean === true),

      construct: (sparql) => attempt('Failed to run SPARQL CONSTRUCT', () => quadsOf(sparql)),

      // LDkit insists on a source; the engine answers every query itself, so this one is a label.
      lens: (schema) => createLens(schema, { engine, sources: ['urn:code-index:native'] }),

      reason: (target, rules, materialize) =>
        attempt('Reasoning failed', () => parseQuads(native.reason(target.value, rules, materialize), 'N-Quads')),

      reasonAll: (reasoners) =>
        attempt('Reasoning failed', () => {
          const byGraph = new Map(reasoners.map((reasoner) => [derivedGraph(reasoner.name), reasoner.name]));
          return native
            .reasonAll(reasoners.map((reasoner) => ({ graph: derivedGraph(reasoner.name), rules: reasoner.rules })))
            .map((outcome) => ({
              name: byGraph.get(outcome.graph) ?? outcome.graph,
              derived: outcome.derived,
              durationMs: outcome.durationMs,
              incremental: outcome.incremental,
            }));
        }),

      count: () => attempt('Failed to count quads', () => native.quadCount()),

      countGraph: (name) => attempt('Failed to count quads', () => native.graphLength(name)),

      clear: () => attempt('Failed to clear graph', () => native.clear()),
    };
    return graph;
  });

const derivedGraph = (name: string): string => Ontology.derivedGraphIri(name).value;
