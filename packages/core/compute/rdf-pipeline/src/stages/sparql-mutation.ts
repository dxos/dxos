//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { RdfPipelineError } from '../errors';
import { Graph } from '../Graph';
import type { Stage } from '../Stage';
import { cloneStore } from '../internal/store';

export type SparqlMutationOptions = {
  readonly sparql: string;
};

/** Apply a SPARQL UPDATE mutation, returning a successor graph with the updated store. */
export const sparqlMutation = ({ sparql }: SparqlMutationOptions): Stage =>
  Effect.fn('rdf-pipeline/stages/sparqlMutation')(function* (graph: Graph) {
    const nextStore = cloneStore(graph.source);
    yield* Effect.tryPromise({
      try: () => graph.engine.queryVoid(sparql, { sources: [nextStore] }),
      catch: (cause) => new RdfPipelineError({ message: 'SPARQL UPDATE failed', cause }),
    });
    return graph.successor(nextStore);
  });
