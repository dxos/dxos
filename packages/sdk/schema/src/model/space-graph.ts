//
// Copyright 2023 DXOS.org
//

import { type CleanupFn } from '@dxos/async';
import { type Space } from '@dxos/client-protocol';
import { getSource, getTarget, isRelation, type AnyLiveObject } from '@dxos/echo-db';
import { Filter, getSchema, getSchemaDXN, type EchoSchema, StoredSchema, getLabel, Query } from '@dxos/echo-schema';
import { Ref } from '@dxos/echo-schema';
import { type GraphEdge, AbstractGraphBuilder, Graph, ReactiveGraphModel } from '@dxos/graph';
import { invariant } from '@dxos/invariant';
import { live } from '@dxos/live-object';
import { log } from '@dxos/log';
import { visitValues } from '@dxos/util';

// TODO(burdon): Alternative diagram types:
// - https://observablehq.com/@d3/radial-tree/2
// - https://observablehq.com/@d3/disjoint-force-directed-graph/2
// - https://observablehq.com/@mbostock/tadpoles
// - https://observablehq.com/@d3/psr-b1919-21
// - https://vasturiano.github.io/react-force-graph/example/basic (3D)

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

// TODO(burdon): Differentiate between refs and relations (via type?).
export type EchoGraphEdge = GraphEdge.Optional;

class SpaceGraphBuilder extends AbstractGraphBuilder<EchoGraphNode, EchoGraphEdge, SpaceGraphModel> {}

const defaultFilter: Filter<any> = Filter.not(Filter.or(Filter.type(StoredSchema)));

export type SpaceGraphModelOptions = {
  showSchema?: boolean;
};

/**
 * Converts ECHO objects to a graph.
 */
export class SpaceGraphModel extends ReactiveGraphModel<EchoGraphNode, EchoGraphEdge> {
  private _schema?: EchoSchema[];
  private _schemaSubscription?: CleanupFn;
  private _objects?: AnyLiveObject<any>[];
  private _objectsSubscription?: CleanupFn;
  private _space?: Space;
  private _filter?: Filter.Any;

  constructor(
    graph?: Partial<Graph>,
    private readonly _options: SpaceGraphModelOptions = {},
  ) {
    super(
      live(Graph, {
        nodes: graph?.nodes ?? [],
        edges: graph?.edges ?? [],
      }),
    );
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

  isOpen() {
    return this._space !== undefined;
  }

  setFilter(filter?: Filter.Any): this {
    this._filter = filter;
    if (this._space) {
      this._subscribe();
    }

    return this;
  }

  // TODO(burdon): Factor out graph builder to lib (use common/graph abstraction).
  // TODO(burdon): Normalize unsubscribe callbacks and merge handlers.
  async open(space: Space, selected?: string): Promise<this> {
    log.info('open');
    if (this.isOpen()) {
      await this.close();
    }

    this._space = space;
    const schemaaQuery = space.db.schemaRegistry.query({});
    const schemas = await schemaaQuery.run();

    const onSchemaUpdate = ({ results }: { results: EchoSchema[] }) => (this._schema = results);
    this._schemaSubscription = schemaaQuery.subscribe(onSchemaUpdate);
    onSchemaUpdate({ results: schemas });
    this._subscribe();
    return this;
  }

  async close(): Promise<this> {
    log.info('close');
    this._schemaSubscription?.();
    this._schemaSubscription = undefined;
    this._objectsSubscription?.();
    this._objectsSubscription = undefined;
    this._space = undefined;
    return this;
  }

  private _subscribe() {
    this._objectsSubscription?.();

    invariant(this._space);
    this._objectsSubscription = this._space.db.query(Query.select(this._filter ?? defaultFilter)).subscribe(
      ({ objects }) => {
        this._objects = [...objects];
        this._update();
      },
      { fire: true },
    );
  }

  private _update() {
    // Merge with current nodes.
    const currentNodes = this._graph.nodes;
    this.clear();

    const addSchema = (typename: string) => {
      if (!this._options.showSchema) {
        return;
      }

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
    this._space?.db.graph.schemaRegistry.schemas.forEach((schema) => {
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
    this._objects?.forEach((object) => {
      const schema = getSchema(object);
      if (!schema) {
        return;
      }

      if (!(isRelation(object) as boolean)) {
        const typename = getSchemaDXN(schema)?.typename;
        if (typename) {
          const current = currentNodes.find((node) => node.id === object.id);
          const label = getLabel(schema, object);
          this._graph.nodes.push({
            ...current,
            id: object.id,
            type: 'object',
            data: { typename, object, label },
          });

          // Link to schema.
          const schemaNode = this._graph.nodes.find(
            (node) => node.type === 'schema' && node.data.typename === typename,
          );
          if (!schemaNode) {
            log.warn('schema node not found', { typename });
          } else {
            if (this._options.showSchema) {
              this.addEdge({
                id: `${object.id}-${schemaNode.id}`,
                type: 'schema',
                source: object.id,
                target: schemaNode.id,
              });
            }
          }

          // Link ot refs.
          const refs = getOutgoingReferences(object);
          for (const ref of refs) {
            if (!ref.target) {
              continue;
            }
            this.addEdge({
              id: `${object.id}-${ref.dxn.toString()}`,
              type: 'ref',
              source: object.id,
              target: ref.target.id,
            });
          }
        }
      } else {
        this.addEdge({
          id: object.id,
          type: 'relation',
          source: getSource(object).id,
          target: getTarget(object).id,
        });
      }
    });
  }
}

const getOutgoingReferences = (object: AnyLiveObject): Ref<any>[] => {
  const refs: Ref<any>[] = [];
  const go = (value: unknown) => {
    if (Ref.isRef(value)) {
      refs.push(value);
    } else {
      visitValues(value, go);
    }
  };

  visitValues(object, go);
  return refs;
};
