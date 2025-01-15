//
// Copyright 2023 DXOS.org
//

import { type ReactiveEchoObject } from '@dxos/echo-db';
import { FormatEnum } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { getSchema, create } from '@dxos/live-object';
import { log } from '@dxos/log';
import { getSchemaProperties } from '@dxos/schema';

import { GraphModel } from './model';
import { Graph, type GraphNode } from './types';

const KEY_REGEX = /\w+/;

// NOTE: The `relation` is different from the `type`.
type EdgeMeta = { source: string; target: string; relation?: string };

export const createEdgeId = ({ source, target, relation }: EdgeMeta) => {
  invariant(source.match(KEY_REGEX), `invalid source: ${source}`);
  invariant(target.match(KEY_REGEX), `invalid target: ${target}`);
  return [source, relation, target].join('_');
};

export const parseEdgeId = (id: string): EdgeMeta => {
  const [source, relation, target] = id.split('_');
  invariant(source.length && target.length);
  return { source, relation: relation.length ? relation : undefined, target };
};

/**
 * Creates a new reactive graph from a set of ECHO objects.
 * References are mapped onto graph edges.
 */
export const createGraph = (objects: ReactiveEchoObject<any>[]): GraphModel<GraphNode<ReactiveEchoObject<any>>> => {
  const graph = new GraphModel<GraphNode<ReactiveEchoObject<any>>>(create(Graph, { nodes: [], edges: [] }));

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
