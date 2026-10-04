//
// Copyright 2026 DXOS.org
//

import type { Bindings, Quad, ResultStream } from '@rdfjs/types';
import { ClassicLevel } from 'classic-level';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import type * as Scope from 'effect/Scope';
import { n3reasoner } from 'eyereasoner';
import { JsonLdParser } from 'jsonld-streaming-parser';
import { type Options as LdkitOptions, createLens } from 'ldkit';
import { DataFactory, Parser, Writer } from 'n3';
import { join } from 'node:path';
import { Quadstore } from 'quadstore';
import { Engine } from 'quadstore-comunica';

import * as Ontology from '../Ontology.ts';
import type { Graph, ReasonOutcome } from './graph.ts';

/**
 * The JavaScript backend: Quadstore over LevelDB, Comunica for SPARQL, EYE (WASM) for rules.
 */

/** The LevelDB directory inside a store. */
export const DIR = 'graph';

/**
 * Whether an asynciterator stream has already finished. Comunica resolves `queryBindings` only after
 * building the stream, so an empty result can emit its one `end` before a caller attaches listeners.
 */
const finished = (stream: ResultStream<unknown>): { destroyed: boolean } | undefined =>
  'done' in stream && stream.done === true
    ? { destroyed: 'destroyed' in stream && stream.destroyed === true }
    : undefined;

// Comunica result streams are typed as bare EventEmitters, so they are drained by event rather than
// through the `toArray` the concrete implementation happens to have.
const collect = <T>(stream: ResultStream<T>): Promise<T[]> =>
  new Promise((resolve, reject) => {
    const state = finished(stream);
    if (state !== undefined) {
      // Data flows only to a `data` listener, so a stream that ended before one attached was empty.
      return state.destroyed ? reject(new Error('Result stream was destroyed before it was read')) : resolve([]);
    }
    const items: T[] = [];
    stream.on('data', (item: T) => items.push(item));
    stream.on('error', reject);
    stream.on('end', () => resolve(items));
  });

/**
 * The predicates a rule set matches on, or `undefined` if any rule leaves a predicate unbound (in
 * which case no narrowing is sound and the whole graph has to go in).
 */
const predicatesOf = (rules: string): Set<string> | undefined => {
  const parsed = new Parser({ format: 'text/n3' }).parse(rules);
  const predicates = new Set<string>();
  for (const quad of parsed) {
    if (quad.predicate.termType !== 'NamedNode') {
      return undefined;
    }
    predicates.add(quad.predicate.value);
  }
  return predicates;
};

export const parseJsonLd = (document: Ontology.FileDocument, graph: Quad['graph']): Promise<Quad[]> =>
  new Promise((resolve, reject) => {
    const parser = new JsonLdParser();
    const quads: Quad[] = [];
    // The parser emits into the default graph; every quad is re-homed into the file's own graph.
    parser.on('data', (quad: Quad) => quads.push(DataFactory.quad(quad.subject, quad.predicate, quad.object, graph)));
    parser.on('error', reject);
    parser.on('end', () => resolve(quads));
    parser.write(JSON.stringify(document));
    parser.end();
  });

/**
 * Premises per EYE input file. EYE's parser holds a whole file's tokens on a 32-bit WASM stack, so
 * one file of a full repository's facts overflows it (`resource_error(stack)`); the files are loaded
 * into one knowledge base, so splitting them bounds parsing without changing what is derived.
 */
export const DEFAULT_CHUNK_SIZE = 100_000;

export type Options = {
  /** Premises per EYE input file (default {@link DEFAULT_CHUNK_SIZE}). */
  readonly chunkSize?: number;
};

const termKey = (term: Quad['object']): string =>
  term.termType === 'Literal'
    ? `L${term.value}\u0000${term.datatype.value}\u0000${term.language}`
    : `${term.termType[0]}${term.value}`;

/**
 * Premises as EYE input files of at most `size` facts: one copy of each fact whatever file graphs
 * assert it, sorted by subject so the writer groups a subject's facts into one statement. A blank
 * node is scoped to the file it is written in, so every fact naming one goes into a single file.
 */
export const premiseChunks = (quads: readonly Quad[], size: number): Quad[][] => {
  if (!Number.isInteger(size) || size < 1) {
    throw new RangeError(`chunkSize must be a positive integer, got ${size}`);
  }
  const distinct = new Map<string, Quad>();
  for (const quad of quads) {
    const key = `${termKey(quad.subject)} ${quad.predicate.value} ${termKey(quad.object)}`;
    if (!distinct.has(key)) {
      distinct.set(key, DataFactory.quad(quad.subject, quad.predicate, quad.object));
    }
  }
  const sorted = [...distinct.values()].sort((left, right) =>
    left.subject.value < right.subject.value ? -1 : left.subject.value > right.subject.value ? 1 : 0,
  );
  const blank = (quad: Quad) => quad.subject.termType === 'BlankNode' || quad.object.termType === 'BlankNode';
  const named = sorted.filter((quad) => !blank(quad));
  const chunks: Quad[][] = [];
  for (let index = 0; index < named.length; index += size) {
    chunks.push(named.slice(index, index + size));
  }
  const withBlanks = sorted.filter(blank);
  return withBlanks.length > 0 ? [...chunks, withBlanks] : chunks;
};

const serialize = (quads: readonly Quad[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const writer = new Writer({ prefixes: Ontology.prefixes, format: 'text/n3' });
    writer.addQuads(quads.map((quad) => DataFactory.quad(quad.subject, quad.predicate, quad.object)));
    writer.end((error, result) => (error ? reject(error) : resolve(result)));
  });

export const make = <E>(
  dir: string,
  fail: (message: string) => (cause: unknown) => E,
  options: Options = {},
): Effect.Effect<Graph<E>, E, Scope.Scope> =>
  Effect.gen(function* () {
    const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
    const attempt = <A>(message: string, thunk: () => Promise<A>): Effect.Effect<A, E> =>
      Effect.tryPromise({ try: thunk, catch: fail(message) });

    const quadstore = new Quadstore({ backend: new ClassicLevel(join(dir, DIR)), dataFactory: DataFactory });
    // Comunica keeps working on a query after its stream ends (cardinality metadata, for one), and
    // touching a closed store throws asynchronously. Queries are counted so the finalizer can wait
    // for the stragglers instead of closing under them.
    let inFlight = 0;
    yield* Effect.acquireRelease(
      attempt('Failed to open graph', () => quadstore.open()),
      () =>
        Effect.orDie(
          attempt('Failed to close graph', async () => {
            while (inFlight > 0) {
              await new Promise((resolve) => setImmediate(resolve));
            }
            // One more turn: the last query's own follow-up work is queued, not yet run.
            await new Promise((resolve) => setImmediate(resolve));
            await quadstore.close();
          }),
        ),
    );
    const engine = new Engine(quadstore);
    const tracked = async <A>(work: () => Promise<A>): Promise<A> => {
      inFlight++;
      try {
        return await work();
      } finally {
        inFlight--;
      }
    };
    // Every file lives in its own named graph, so queries treat the default graph as their union —
    // otherwise a SPARQL pattern without an explicit GRAPH clause would match nothing.
    const context = { unionDefaultGraph: true };
    const ldkit: LdkitOptions = { sources: [quadstore], engine, ...context };

    const match: Graph<E>['match'] = (subject, predicate, object, graph) =>
      attempt('Failed to match quads', async () => (await quadstore.get({ subject, predicate, object, graph })).items);

    /** Swap a graph's contents in one backend batch: nothing observes a half-written graph. */
    const patch = (previous: Quad[], next: readonly Quad[]): Effect.Effect<void, E> =>
      attempt('Failed to patch graph', () => quadstore.multiPatch(previous, [...next]).then(() => undefined));

    const ofGraph = (graph: string) => match(undefined, undefined, undefined, DataFactory.namedNode(graph));

    /**
     * The premises a rule set can actually use: asserted facts, narrowed to the predicates the
     * rules mention. Handing EYE the whole graph made the reasoning phase cost more than the rest
     * of an indexing pass by two orders of magnitude, for facts no rule could match.
     */
    const facts = (rules: string, ownGraph: string, hidden: ReadonlySet<string>): Effect.Effect<Quad[], E> =>
      Effect.map(match(), (quads) => {
        const wanted = predicatesOf(rules);
        // A reasoner never sees its own conclusions — reading its own output back would let a
        // derivation keep itself alive — nor, in an ordered pass, those of reasoners after it.
        return quads.filter(
          (quad) =>
            quad.graph.value !== ownGraph &&
            !hidden.has(quad.graph.value) &&
            (wanted === undefined || wanted.has(quad.predicate.value)),
        );
      });

    const reasonWith = (
      graph: Quad['graph'],
      rules: string,
      materialize: boolean,
      hidden: ReadonlySet<string>,
    ): Effect.Effect<Quad[], E> =>
      Effect.gen(function* () {
        const premises = yield* facts(rules, graph.value, hidden);
        const data = yield* Effect.forEach(premiseChunks(premises, chunkSize), (chunk) =>
          attempt('Failed to serialize graph', () => serialize(chunk)),
        );
        const derived = yield* attempt('Reasoning failed', () =>
          n3reasoner([rules, ...data], undefined, { output: 'derivations' }),
        );
        const parsed = yield* Effect.try({
          try: () => new Parser({ format: 'text/n3' }).parse(typeof derived === 'string' ? derived : ''),
          catch: fail('Failed to parse derivations'),
        });
        const quads = parsed.map((quad) => DataFactory.quad(quad.subject, quad.predicate, quad.object, graph));
        if (materialize) {
          // The reasoner's whole graph is replaced in one batch, so conclusions are either the
          // ones this pass entailed or none at all — never a mix of two generations.
          yield* patch(yield* ofGraph(graph.value), quads);
        }
        return quads;
      });

    const reason: Graph<E>['reason'] = (graph, rules, materialize) => reasonWith(graph, rules, materialize, new Set());

    const graph: Graph<E> = {
      swap: (writes) =>
        Effect.gen(function* () {
          const quads: Quad[] = [];
          const stale: Quad[] = [];
          for (const { clear, graph, triples } of writes) {
            const target = DataFactory.namedNode(graph);
            const parsed = yield* Effect.try({
              try: () => new Parser({ format: 'N-Triples' }).parse(triples),
              catch: fail('Failed to parse document'),
            });
            quads.push(...parsed.map((quad) => DataFactory.quad(quad.subject, quad.predicate, quad.object, target)));
            for (const name of clear) {
              stale.push(...(yield* ofGraph(name)));
            }
          }
          yield* patch(stale, quads);
        }),

      drop: (name) =>
        Effect.flatMap(ofGraph(name), (quads) =>
          quads.length === 0
            ? Effect.void
            : attempt('Failed to drop graph', () => quadstore.multiDel(quads).then(() => undefined)),
        ),

      putQuads: (quads) =>
        quads.length === 0
          ? Effect.void
          : attempt('Failed to write quads', () => quadstore.multiPut([...quads]).then(() => undefined)),

      delQuads: (quads) =>
        quads.length === 0
          ? Effect.void
          : attempt('Failed to delete quads', () => quadstore.multiDel([...quads]).then(() => undefined)),

      match,

      select: (sparql) =>
        attempt('Failed to run SPARQL SELECT', () =>
          tracked(async () => {
            const rows = await collect<Bindings>(await engine.queryBindings(sparql, context));
            return rows.map((row) => Object.fromEntries([...row].map(([key, term]) => [key.value, term.value])));
          }),
        ),

      ask: (sparql) => attempt('Failed to run SPARQL ASK', () => tracked(() => engine.queryBoolean(sparql, context))),

      construct: (sparql) =>
        attempt('Failed to run SPARQL CONSTRUCT', () =>
          tracked(() => engine.queryQuads(sparql, context).then(collect<Quad>)),
        ),

      lens: (schema) => createLens(schema, ldkit),

      reason,

      reasonAll: (reasoners) =>
        Effect.forEach(reasoners, (reasoner, index) =>
          Effect.map(
            Effect.timed(
              reasonWith(
                Ontology.derivedGraphIri(reasoner.name),
                reasoner.rules,
                true,
                new Set(reasoners.slice(index + 1).map((later) => Ontology.derivedGraphIri(later.name).value)),
              ),
            ),
            ([duration, quads]) =>
              ({
                name: reasoner.name,
                derived: quads.length,
                durationMs: Duration.toMillis(duration),
                incremental: false,
              }) satisfies ReasonOutcome,
          ),
        ),

      count: () => Effect.map(match(), (quads) => quads.length),

      countGraph: (name) =>
        attempt('Failed to count quads', async () => {
          const { iterator } = await quadstore.getStream({ graph: DataFactory.namedNode(name) });
          // Counted as they stream past, so a large graph is never held in memory.
          return new Promise<number>((resolve, reject) => {
            let count = 0;
            iterator.on('data', () => {
              count += 1;
            });
            iterator.on('error', reject);
            iterator.on('end', () => resolve(count));
          });
        }),

      clear: () => attempt('Failed to clear graph', () => quadstore.clear()),
    };
    return graph;
  });
