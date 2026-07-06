//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj, Type } from '@dxos/echo';
import type * as EntityModule from '@dxos/echo/Entity';

import { DetachedGraphError, RdfPipelineError } from '../errors';
import { Graph } from '../Graph';
import type { EntityStage, Stage } from '../Stage';
import { filterQuadsByTypenames, quadsToEntityJson } from '../internal/entity-rdf';
import { storeFromQuads } from '../internal/store';

export type ExtractEntitiesOptions = {
  /** ECHO type entities whose instances should be extracted. */
  readonly types: readonly Type.AnyEntity[];
};

const typeUri = (typeEntity: Type.AnyEntity): string => Type.getURI(typeEntity).toString();

/** Decode entities of the requested types from the graph. */
export const extractEntities =
  <T extends EntityModule.Unknown = EntityModule.Unknown>(
    options: ExtractEntitiesOptions,
  ): EntityStage<T> =>
  Effect.fn('rdf-pipeline/stages/extractEntities')(function* (graph: Graph) {
    if (!graph.attached) {
      return yield* Effect.fail(new DetachedGraphError({ message: 'Graph has been detached' }));
    }
    const typenames = new Set(options.types.map(typeUri));
    const json = quadsToEntityJson(graph.getQuads()).filter((entity) => {
      const typename = entity['@type'];
      return typeof typename === 'string' && typenames.has(typename);
    });
    const entities = yield* Effect.tryPromise({
      try: () => Promise.all(json.map((item) => Obj.fromJSON(item) as Promise<T>)),
      catch: (cause) => new RdfPipelineError({ message: 'Failed to decode entities from graph', cause }),
    });
    return entities;
  });

/** Filter the graph to a subgraph containing only entities of the requested types. */
export const extractEntitiesGraph = (options: ExtractEntitiesOptions): Stage =>
  Effect.fn('rdf-pipeline/stages/extractEntitiesGraph')(function* (graph: Graph) {
    if (!graph.attached) {
      return yield* Effect.fail(new DetachedGraphError({ message: 'Graph has been detached' }));
    }
    const typenames = new Set(options.types.map(typeUri));
    const filtered = filterQuadsByTypenames(graph.getQuads(), typenames);
    return graph.successor(storeFromQuads(filtered));
  });

/** Convenience alias for {@link extractEntities}. */
export const decodeEntities = extractEntities;
