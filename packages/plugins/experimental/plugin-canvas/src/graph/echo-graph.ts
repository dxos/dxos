//
// Copyright 2023 DXOS.org
//

import { AST, MutableSchema, ReferenceAnnotationId, SchemaValidator, StoredSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type ReactiveEchoObject, type Space, getSchema, getType } from '@dxos/react-client/echo';

import { type GraphModel } from './graph';

// TODO(burdon): Reconcile with debug and explorer plugin (graph-model).

export type GraphOptions = {
  linkSchema?: boolean;
};

/**
 * Map objects onto graph.
 */
// TODO(burdon): GraphBuilder? With subscriptions?
export const mapObjects = (
  graph: GraphModel,
  space: Space,
  objects: ReactiveEchoObject<any>[],
  options?: GraphOptions,
): GraphModel => {
  // Map objects.
  objects.forEach((object) => {
    if (object instanceof StoredSchema) {
      const schema = space.db.schemaRegistry.getSchemaById(object.id);
      invariant(schema);
      graph.addNode({ id: object.id, type: StoredSchema.typename, data: schema.schema });
    } else {
      graph.addNode({ id: object.id, type: object.typename, data: object });
    }
  });

  // Find references.
  objects.forEach((object) => {
    const typeId = getType(object)?.objectId;
    const schema = getSchema(object);
    if (!schema || !typeId) {
      log.info('no schema for object', { id: object.id.slice(0, 8) });
    }

    invariant(typeId);
    invariant(schema);
    // TODO(burdon): ???
    if (!(schema instanceof MutableSchema)) {
      const node = graph.getNode(typeId);
      if (!node) {
        graph.addNode({ id: typeId, type: StoredSchema.typename, data: schema });
      }
    }

    if (options?.linkSchema) {
      graph.addEdge({ id: `${object.id}-${typeId}`, source: object.id, target: typeId });
    }

    // Parse schema to follow referenced objects.
    AST.getPropertySignatures(schema.ast).forEach((prop) => {
      if (!SchemaValidator.hasTypeAnnotation(schema, prop.name.toString(), ReferenceAnnotationId)) {
        return;
      }

      const value = object[String(prop.name)];
      if (value) {
        const refs = Array.isArray(value) ? value : [value];
        for (const ref of refs) {
          if (objects.findIndex((obj) => obj.id === ref.id) !== -1) {
            graph.addEdge({
              id: `${object.id}-${String(prop.name)}-${ref.id}`,
              source: object.id,
              target: ref.id,
            });
          }
        }
      }
    });
  });

  return graph;
};
