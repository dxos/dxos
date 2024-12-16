//
// Copyright 2023 DXOS.org
//

import { AST, ReferenceAnnotationId, SchemaValidator } from '@dxos/echo-schema';
import { log } from '@dxos/log';
import { type ReactiveEchoObject, getSchema } from '@dxos/react-client/echo';

import { GraphModel, type Node } from './graph';

// TODO(burdon): Reconcile with debug and explorer plugin (graph-model).

export type GraphOptions = {
  linkSchema?: boolean;
};

/**
 * Map objects onto graph.
 */
// TODO(burdon): GraphBuilder? With subscriptions?
export const createGraph = (
  objects: ReactiveEchoObject<any>[],
  options?: GraphOptions,
): GraphModel<Node<ReactiveEchoObject<any>>> => {
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
    AST.getPropertySignatures(schema.ast).forEach((prop) => {
      // TODO(burdon): No references.
      if (!SchemaValidator.hasTypeAnnotation(schema, prop.name.toString(), ReferenceAnnotationId)) {
        return;
      }

      const value = object[String(prop.name)];
      if (value) {
        const refs = Array.isArray(value) ? value : [value];
        for (const ref of refs) {
          const source = object;
          const target = graph.getNode(ref.id);
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
  });

  return graph;
};
