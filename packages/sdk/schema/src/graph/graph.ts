//
// Copyright 2024 DXOS.org
//

import { type Entity, Obj, Ref } from '@dxos/echo';
import { GraphModel, type GraphNode, createEdgeId } from '@dxos/graph';
import { log } from '@dxos/log';

import { getSchemaProperties } from '../projection';

/**
 * Creates a new reactive graph from a set of ECHO objects.
 * References are mapped onto graph edges.
 */
export const createGraph = <T extends Entity.Unknown>(objects: T[]): GraphModel<GraphNode.Required<T>> => {
  const graph = new GraphModel<GraphNode.Required<T>>({ nodes: [], edges: [] });

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
    for (const prop of getSchemaProperties(schema.ast, object)) {
      if (Ref.isRefType(prop.ast)) {
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
