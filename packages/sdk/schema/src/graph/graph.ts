//
// Copyright 2024 DXOS.org
//

import { type Entity, Obj, Ref } from '@dxos/echo';
import { getProperties } from '@dxos/effect';
import { type Graph, GraphModel, createEdgeId } from '@dxos/graph';
import { log } from '@dxos/log';

/**
 * Creates a new reactive graph from a set of ECHO objects.
 * References are mapped onto graph edges.
 */
export const createGraph = <T extends Entity.Unknown>(objects: T[]): GraphModel.GraphModel<Graph.Node.Required<T>> => {
  const graph = new GraphModel.GraphModel<Graph.Node.Required<T>>({ nodes: [], edges: [] });

  // Map objects.
  objects.forEach((object) => {
    graph.addNode({ id: object.id, type: Obj.getTypename(object), data: object });
  });

  // Find references.
  objects.forEach((object) => {
    const schema = Obj.getSchema(object);
    if (!schema) {
      log('no schema for object', { id: object.id.slice(0, 8) });
      return;
    }

    // Parse schema to follow referenced objects.
    for (const prop of getProperties(schema.ast)) {
      if (Ref.isRefType(prop.type)) {
        const source = object;
        const target = (object as any)[prop.name]?.target;
        if (target) {
          graph.addEdge({
            id: createEdgeId({ source: source.id, target: target.id, relation: String(prop.name) }),
            source: source.id,
            target: target.id,
          });
        }
      }
    }
  });

  return graph;
};
