//
// Copyright 2024 DXOS.org
//

import { type AnyLiveObject } from '@dxos/echo-db';
import { FormatEnum, getSchema } from '@dxos/echo-schema';
import { live } from '@dxos/live-object';
import { log } from '@dxos/log';
import { getSchemaProperties } from '@dxos/schema';

import { GraphModel } from './model';
import { Graph, type GraphNode } from './types';
import { createEdgeId } from './util';

/**
 * Creates a new reactive graph from a set of ECHO objects.
 * References are mapped onto graph edges.
 */
export const createGraph = (objects: AnyLiveObject<any>[]): GraphModel<GraphNode<AnyLiveObject<any>>> => {
  const graph = new GraphModel<GraphNode<AnyLiveObject<any>>>(live(Graph, { nodes: [], edges: [] }));

  // Map objects.
  objects.forEach((object) => {
    graph.addNode({ id: object.id, type: object.typename, data: object });
  });

  // Find references.
  objects.forEach((object) => {
    const schema = getSchema(object);
    if (!schema) {
      log.info('no schema for object', { id: object.id.slice(0, 8) });
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
