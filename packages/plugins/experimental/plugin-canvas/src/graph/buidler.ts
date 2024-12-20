//
// Copyright 2023 DXOS.org
//

import { FormatEnum } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { type ReactiveEchoObject, getSchema } from '@dxos/react-client/echo';
import { getSchemaProperties } from '@dxos/schema';

import { GraphModel, type Node } from './graph';

// TODO(burdon): Factor out graph. Reconcile with debug and explorer plugin (graph-model).
// TODO(burdon): GraphBuilder? With subscriptions?

/**
 * Maps an ECHO object graph onto a layout graph.
 */
export const createGraph = (objects: ReactiveEchoObject<any>[]): GraphModel<Node<ReactiveEchoObject<any>>> => {
  const graph = new GraphModel<Node<ReactiveEchoObject<any>>>();

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
            id: `${source.id}-${String(prop.name)}-${target.id}`,
            source: source.id,
            target: target.id,
          });
        }
      }
    }
  });

  return graph;
};
