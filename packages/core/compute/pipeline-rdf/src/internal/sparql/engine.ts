//
// Copyright 2026 DXOS.org
//

import { QueryEngine } from '@comunica/query-sparql-rdfjs';
import * as Effect from 'effect/Effect';

import { SemanticIndexError } from '../../errors.ts';

// TOOD(burdon): See also https://ldkit.io/docs/components/query-engine

/** Context accepted by the engine for string queries (carries the `sources` array). */
type QueryContext = NonNullable<Parameters<QueryEngine['queryBindings']>[1]>;

/** A single source entry (RDF/JS Source, store, string, etc.) accepted by Comunica. */
type Source = QueryContext['sources'][number];

// Annotated to avoid TS2883 (inferred QueryEngine type is not portable across packages).
export const makeEngine = (): QueryEngine => new QueryEngine();

/**
 * Run a SELECT binding `?g` (a named graph) and return the distinct graph IRIs; `?fact`, the variable of the
 * reified shape, is accepted as an alias.
 */
export const selectGraphs = (
  engine: QueryEngine,
  source: Source,
  sparql: string,
): Effect.Effect<string[], SemanticIndexError> =>
  Effect.tryPromise({
    try: async () => {
      const stream = await engine.queryBindings(sparql, { sources: [source] });
      const bindings = await stream.toArray();
      const graphs = new Set<string>();
      for (const binding of bindings) {
        const graph = binding.get('g') ?? binding.get('fact');
        if (graph?.termType === 'NamedNode') {
          graphs.add(graph.value);
        }
      }
      return [...graphs];
    },
    catch: (cause) => new SemanticIndexError({ message: 'SPARQL query failed', cause }),
  });
