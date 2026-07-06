//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import type * as EntityModule from '@dxos/echo/Entity';

import { Graph } from '../Graph';
import type { Stage } from '../Stage';
import { entitiesToQuads } from '../internal/entity-rdf';
import { cloneStore } from '../internal/store';

export type FromEntitiesOptions = {
  readonly entities: readonly EntityModule.Unknown[];
  /** When true, append entity triples to the input graph instead of replacing it. */
  readonly merge?: boolean;
};

/** Materialize ECHO entities as RDF triples in a new (or merged) graph. */
export const fromEntities =
  ({ entities, merge = false }: FromEntitiesOptions): Stage =>
  (graph) =>
    Effect.sync(() => {
      const quads = entitiesToQuads(entities);
      if (merge && graph.attached) {
        const store = cloneStore(graph.source);
        for (const quad of quads) {
          store.addQuad(quad);
        }
        return graph.successor(store);
      }
      return Graph.fromQuads(quads, graph.engine);
    });
