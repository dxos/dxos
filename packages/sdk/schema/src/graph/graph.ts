//
// Copyright 2024 DXOS.org
//

import { Entity, Ref, Type } from '@dxos/echo';
import { SchemaEx } from '@dxos/effect';
import * as GraphEdge from '@dxos/graph/GraphEdge';
import * as GraphModel from '@dxos/graph/GraphModel';
import * as GraphNode from '@dxos/graph/GraphNode';
import { log } from '@dxos/log';

/**
 * Creates a new reactive graph from a set of ECHO objects.
 * References are mapped onto graph edges.
 */
export const createGraph = <T extends Entity.Unknown>(objects: T[]): GraphModel.GraphModel<GraphNode.Of<T>> => {
  const graph = new GraphModel.GraphModel<GraphNode.Of<T>>();

  // Map objects.
  objects.forEach((object) => {
    graph.addNode({ id: object.id, type: Entity.getTypename(object), data: object });
  });

  // Find references.
  objects.forEach((object) => {
    const type = Entity.getType(object);
    if (!type) {
      log('no schema for object', { id: object.id.slice(0, 8) });
      return;
    }
    const schema = Type.getSchema(type);

    // Parse schema to follow referenced objects.
    for (const prop of SchemaEx.getProperties(schema.ast)) {
      if (Ref.isRefType(prop.type)) {
        const source = object;
        const target = (object as any)[prop.name]?.target;
        if (target) {
          graph.addEdge({
            id: GraphEdge.createId({ source: source.id, target: target.id, relation: String(prop.name) }),
            source: source.id,
            target: target.id,
          });
        }
      }
    }
  });

  return graph;
};
