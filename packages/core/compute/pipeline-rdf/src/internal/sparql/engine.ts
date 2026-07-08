//
// Copyright 2026 DXOS.org
//

import { QueryEngine } from '@comunica/query-sparql-rdfjs';
import * as Effect from 'effect/Effect';
import { DataFactory, type Quad } from 'n3';

import { SemanticIndexError } from '../../errors';

const { quad } = DataFactory;

// TOOD(burdon): See also https://ldkit.io/docs/components/query-engine

/** Context accepted by the engine for string queries (carries the `sources` array). */
type QueryContext = NonNullable<Parameters<QueryEngine['queryBindings']>[1]>;

/** A single source entry (RDF/JS Source, store, string, etc.) accepted by Comunica. */
type Source = QueryContext['sources'][number];

// Annotated to avoid TS2883 (inferred QueryEngine type is not portable across packages).
export const makeEngine = (): QueryEngine => new QueryEngine();

/** Run a SELECT (?fact ?p ?o) over the source and return the result rows as Quads. */
export const selectTriples = (
  engine: QueryEngine,
  source: Source,
  sparql: string,
): Effect.Effect<Quad[], SemanticIndexError> =>
  Effect.tryPromise({
    try: async () => {
      const stream = await engine.queryBindings(sparql, { sources: [source] });
      const bindings = await stream.toArray();
      const quads: Quad[] = [];
      for (const binding of bindings) {
        const fact = binding.get('fact');
        const predicate = binding.get('p');
        const object = binding.get('o');
        if (fact === undefined || predicate === undefined || object === undefined) {
          continue;
        }
        if (fact.termType !== 'NamedNode' || predicate.termType !== 'NamedNode') {
          continue;
        }
        if (object.termType !== 'NamedNode' && object.termType !== 'Literal') {
          continue;
        }
        quads.push(quad(fact, predicate, object));
      }
      return quads;
    },
    catch: (cause) => new SemanticIndexError({ message: 'SPARQL query failed', cause }),
  });
