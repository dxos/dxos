//
// Copyright 2023 DXOS.org
//

import { SchemaAST } from 'effect';

import { type CleanupFn } from '@dxos/async';
import {
  getSchema,
  getSchemaDXN,
  type EchoSchema,
  ReferenceAnnotationId,
  SchemaValidator,
  StoredSchema,
} from '@dxos/echo-schema';
import { type GraphEdge, AbstractGraphBuilder, Graph, ReactiveGraphModel } from '@dxos/graph';
import { log } from '@dxos/log';
import { CollectionType } from '@dxos/plugin-space/types';
import { Filter, live, type AnyLiveObject, type Space } from '@dxos/react-client/echo';

export type SpaceGraphModelOptions = {
  schema?: boolean;
};

type SchemaGraphNode = {
  id: string;
  type: 'schema';
  data: {
    typename: string;
  };
};

type ObjectGraphNode = {
  id: string;
  type: 'object';
  data: {
    typename: string;
    object: AnyLiveObject<any>;
  };
};

export type EchoGraphNode = SchemaGraphNode | ObjectGraphNode;

// TODO(burdon): Differentiate between refs and relations.
export type EchoGraphEdge = GraphEdge.Optional;

class SpaceGraphBuilder extends AbstractGraphBuilder<EchoGraphNode, EchoGraphEdge, SpaceGraphModel> {}

/**
 * Converts ECHO objects to a graph.
 */
export class SpaceGraphModel extends ReactiveGraphModel<EchoGraphNode, EchoGraphEdge> {
  private _schema?: EchoSchema[];
  private _schemaSubscription?: CleanupFn;
  private _objects?: AnyLiveObject<any>[];
  private _objectsSubscription?: CleanupFn;

  constructor(
    graph?: Partial<Graph>,
    private readonly _options: SpaceGraphModelOptions = {},
  ) {
    super(live(Graph, { nodes: graph?.nodes ?? [], edges: graph?.edges ?? [] }));
  }

  override get builder() {
    return new SpaceGraphBuilder(this);
  }

  override copy(graph?: Partial<Graph>) {
    return new SpaceGraphModel(graph);
  }

  get objects(): AnyLiveObject<any>[] {
    return this._objects ?? [];
  }

  // TODO(burdon): Alternative diagram types:
  // - https://observablehq.com/@d3/radial-tree/2
  // - https://observablehq.com/@d3/disjoint-force-directed-graph/2
  // - https://observablehq.com/@mbostock/tadpoles
  // - https://observablehq.com/@d3/psr-b1919-21
  // - https://vasturiano.github.io/react-force-graph/example/basic (3D)

  // TODO(burdon): Factor out builder.
  async open(space: Space, objectId?: string) {
    // TODO(burdon): Factor out graph builder to lib (use common/graph abstraction).
    if (!this._schemaSubscription) {
      // TODO(burdon): Normalize unsubscribe callbacks and merge handlers.
      // TODO(burdon): Trigger initial subscription update.
      // TODO(burdon): Normalize subscription cb for objects, schema, etc.

      const schemaaQuery = space.db.schemaRegistry.query({});
      const schemas = await schemaaQuery.run();
      const onSchemaUpdate = ({ results }: { results: EchoSchema[] }) => (this._schema = results);
      this._schemaSubscription = schemaaQuery.subscribe(onSchemaUpdate);
      onSchemaUpdate({ results: schemas });

      this._objectsSubscription = space.db
        // TODO(burdon): ERROR: Cannot mix type and or filters.
        .query(Filter.not(Filter.or(Filter.type(StoredSchema), Filter.type(CollectionType))))
        .subscribe(
          ({ objects }) => {
            this._objects = objects;

            // Merge with current nodes.
            const currentNodes = this._graph.nodes;

            this.clear();

            const addSchema = (typename: string) => {
              const current = currentNodes.find((node) => node.id === typename);
              if (typename) {
                this._graph.nodes.push({
                  ...current,
                  id: typename,
                  type: 'schema',
                  data: { typename },
                });
              }
            };

            // Runtime schema.
            space.db.graph.schemaRegistry.schemas.forEach((schema) => {
              const typename = getSchemaDXN(schema)?.typename;
              if (typename) {
                addSchema(typename);
              }
            });

            // Database Schema.
            this._schema?.forEach((schema) => {
              const typename = getSchemaDXN(schema)?.typename;
              if (typename) {
                addSchema(typename);
              }
            });

            // Database Objects.
            this._objects.forEach((object) => {
              const schema = getSchema(object);
              if (schema) {
                const typename = getSchemaDXN(schema)?.typename;
                if (typename) {
                  const current = currentNodes.find((node) => node.id === object.id);
                  this._graph.nodes.push({ ...current, id: object.id, type: 'object', data: { typename, object } });

                  // Link to schema.
                  const schemaNode = this._graph.nodes.find(
                    (node) => node.type === 'schema' && node.data.typename === typename,
                  );
                  if (schemaNode) {
                    this.addEdge({
                      id: `${object.id}-${schemaNode.id}`,
                      source: object.id,
                      target: schemaNode.id,
                    });
                  } else {
                    log.info('schema node not found', { typename });
                  }

                  // Link ot refs.
                  // TODO(burdon): This isn't working.
                  SchemaAST.getPropertySignatures(schema.ast).forEach((prop) => {
                    if (!SchemaValidator.hasTypeAnnotation(schema, prop.name.toString(), ReferenceAnnotationId)) {
                      return;
                    }

                    const value = object[String(prop.name)];
                    if (value) {
                      const refs = Array.isArray(value) ? value : [value];
                      for (const ref of refs) {
                        if (objects.findIndex((obj) => obj.id === ref.id) !== -1) {
                          this.addEdge({
                            id: `${object.id}-${String(prop.name)}-${ref.id}`,
                            source: object.id,
                            target: ref.id,
                          });
                        }
                      }
                    }
                  });
                }
              }
            });
          },
          { fire: true },
        );
    }

    // TODO(burdon): Selection model.
    // this.setSelected(objectId);
    return this;
  }

  close() {
    this._schemaSubscription?.();
    this._schemaSubscription = undefined;
    this._objectsSubscription?.();
    this._objectsSubscription = undefined;
    return this;
  }
}
