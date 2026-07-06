//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { Store } from 'n3';

import { DetachedGraphError, RdfPipelineError } from '../errors';
import { Graph } from '../Graph';
import type { Stage } from '../Stage';
import { cloneStore } from '../internal/store';

export type SparqlConstructOptions = {
  readonly sparql: string;
  /** When true, merge constructed triples into a clone of the input graph. Default false. */
  readonly merge?: boolean;
};

/** Run a SPARQL CONSTRUCT query and materialize the result as a new graph. */
export const sparqlConstruct = ({ sparql, merge = false }: SparqlConstructOptions): Stage =>
  Effect.fn('rdf-pipeline/stages/sparqlConstruct')(function* (graph: Graph) {
    if (!graph.attached) {
      return yield* Effect.fail(new DetachedGraphError({ message: 'Graph has been detached' }));
    }
    const stream = yield* Effect.tryPromise({
      try: () => graph.engine.queryQuads(sparql, { sources: [graph.source] }),
      catch: (cause) => new RdfPipelineError({ message: 'SPARQL CONSTRUCT failed', cause }),
    });
    const constructed = yield* Effect.tryPromise({
      try: () => stream.toArray(),
      catch: (cause) => new RdfPipelineError({ message: 'Failed to read CONSTRUCT results', cause }),
    });
    const nextStore = merge ? cloneStore(graph.source) : new Store();
    for (const quad of constructed) {
      nextStore.addQuad(quad);
    }
    return graph.successor(nextStore);
  });
