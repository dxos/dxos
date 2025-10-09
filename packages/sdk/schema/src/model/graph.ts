//
// Copyright 2024 DXOS.org
//

import { type AnyLiveObject } from '@dxos/echo-db';
import { type BaseObject, FormatEnum, getSchema } from '@dxos/echo/internal';
import { Graph, GraphModel, type GraphNode, createEdgeId } from '@dxos/graph';
import { log } from '@dxos/log';

import { Obj } from '@dxos/echo';
import { getSchemaProperties } from '../properties';

/**
 * Creates a new reactive graph from a set of ECHO objects.
 * References are mapped onto graph edges.
 */
export const createGraph = <T extends BaseObject>(
  objects: AnyLiveObject<T>[],
): GraphModel<GraphNode.Required<AnyLiveObject<T>>> => {
  const graph = new GraphModel<GraphNode.Required<AnyLiveObject<T>>>(Obj.make(Graph, { nodes: [], edges: [] }));

  // Map objects.
  objects.forEach((object) => {
    graph.addNode({ id: object.id, type: object.typename, data: object });
  });

  // Find references.
  objects.forEach((object) => {
    const schema = getSchema(object);
    if (!schema) {
      log('no schema for object', { id: object.id.slice(0, 8) });
      return;
    }

    // Parse schema to follow referenced objects.
    for (const prop of getSchemaProperties(schema.ast, object)) {
      if (prop.format === FormatEnum.Ref) {
        const source = object;
        const target = object[prop.name]?.target;
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
