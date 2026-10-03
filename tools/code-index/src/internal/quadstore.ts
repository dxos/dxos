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

const GRAPH_DIR = 'graph';

// Comunica result streams are typed as bare EventEmitters, so they are drained by event rather than
// through the `toArray` the concrete implementation happens to have.
const collect = <T>(stream: ResultStream<T>): Promise<T[]> =>
  new Promise((resolve, reject) => {
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

const serialize = (quads: readonly Quad[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const writer = new Writer({ prefixes: Ontology.prefixes, format: 'text/n3' });
    writer.addQuads(quads.map((quad) => DataFactory.quad(quad.subject, quad.predicate, quad.object)));
    writer.end((error, result) => (error ? reject(error) : resolve(result)));
  });

export const make = <E>(
  dir: string,
  fail: (message: string) => (cause: unknown) => E,
): Effect.Effect<Graph<E>, E, Scope.Scope> =>
  Effect.gen(function* () {
    const attempt = <A>(message: string, thunk: () => Promise<A>): Effect.Effect<A, E> =>
      Effect.tryPromise({ try: thunk, catch: fail(message) });

    const quadstore = new Quadstore({ backend: new ClassicLevel(join(dir, GRAPH_DIR)), dataFactory: DataFactory });
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
    const facts = (rules: string, ownGraph: string): Effect.Effect<Quad[], E> =>
      Effect.map(match(), (quads) => {
        const wanted = predicatesOf(rules);
        // A reasoner sees the file graphs and every other reasoner's conclusions, but never its own:
        // reading its own output back would let a derivation keep itself alive.
        return quads.filter(
          (quad) => quad.graph.value !== ownGraph && (wanted === undefined || wanted.has(quad.predicate.value)),
        );
      });

    const reason: Graph<E>['reason'] = (graph, rules, materialize) =>
      Effect.gen(function* () {
        const premises = yield* facts(rules, graph.value);
        const data = yield* attempt('Failed to serialize graph', () => serialize(premises));
        const derived = yield* attempt('Reasoning failed', () =>
          n3reasoner([data, rules].join('\n'), undefined, { output: 'derivations' }),
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

    const graph: Graph<E> = {
      swap: (clear, target, document) =>
        Effect.gen(function* () {
          const quads = yield* attempt('Failed to parse document', () => parseJsonLd(document, target));
          const stale: Quad[] = [];
          for (const name of clear) {
            stale.push(...(yield* ofGraph(name)));
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
        Effect.forEach(reasoners, (reasoner) =>
          Effect.map(
            Effect.timed(reason(Ontology.derivedGraphIri(reasoner.name), reasoner.rules, true)),
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

      clear: () =>
        Effect.flatMap(match(), (quads) =>
          quads.length === 0
            ? Effect.void
            : attempt('Failed to clear graph', () => quadstore.multiDel(quads).then(() => undefined)),
        ),
    };
    return graph;
  });
