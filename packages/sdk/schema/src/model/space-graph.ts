//
// Copyright 2023 DXOS.org
//

import { batch, effect } from '@preact/signals-core';

import { type CleanupFn } from '@dxos/async';
import { type Space } from '@dxos/client-protocol';
import { Relation } from '@dxos/echo';
import { type AnyLiveObject, type Queue } from '@dxos/echo-db';
import { Filter, getSchema, getSchemaDXN, type EchoSchema, getLabel, Query } from '@dxos/echo-schema';
import { Ref } from '@dxos/echo-schema';
import { type GraphEdge, AbstractGraphBuilder, type Graph, ReactiveGraphModel, type GraphNode } from '@dxos/graph';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { visitValues } from '@dxos/util';

// TODO(burdon): Alternative diagram types:
// - https://observablehq.com/@d3/radial-tree/2
// - https://observablehq.com/@d3/disjoint-force-directed-graph/2
// - https://observablehq.com/@mbostock/tadpoles
// - https://observablehq.com/@d3/psr-b1919-21
// - https://vasturiano.github.io/react-force-graph/example/basic (3D)

export type SpaceGraphNode = GraphNode.Required<{
  label: string;
  object?: AnyLiveObject<any>;
}>;

// TODO(burdon): Differentiate between refs and relations.
export type SpaceGraphEdge = GraphEdge.Optional;

class SpaceGraphBuilder extends AbstractGraphBuilder<SpaceGraphNode, SpaceGraphEdge, SpaceGraphModel> {}

const defaultFilter: Filter<any> = Filter.everything();

export type SpaceGraphModelOptions = {
  showSchema?: boolean;
  onCreateNode?: (node: SpaceGraphNode, object: AnyLiveObject<any>) => void;
  onCreateEdge?: (edge: SpaceGraphEdge, relation: Relation.Any) => void;
};

/**
 * Converts ECHO objects to a graph.
 */
export class SpaceGraphModel extends ReactiveGraphModel<SpaceGraphNode, SpaceGraphEdge> {
  private _options?: SpaceGraphModelOptions;
  private _filter?: Filter.Any;

  private _space?: Space;
  private _schema?: EchoSchema[];
  private _schemaSubscription?: CleanupFn;
  private _objects?: AnyLiveObject<any>[];
  private _queueItems?: AnyLiveObject<any>[];
  private _objectsSubscription?: CleanupFn;
  private _queueSubscription?: CleanupFn;

  private _queue?: Queue;

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

  setOptions(options?: SpaceGraphModelOptions): this {
    this._options = options;
    if (this.isOpen()) {
      this.invalidate();
    }

    return this;
  }

  setFilter(filter?: Filter.Any): this {
    this._filter = filter;
    if (this.isOpen()) {
      this._subscribe();
    }

    return this;
  }

  async open(space: Space, queue?: Queue): Promise<this> {
    log('open');
    if (this.isOpen()) {
      await this.close();
    }

    this._space = space;
    this._queue = queue;
    const schemaaQuery = space.db.schemaRegistry.query({});
    const schemas = await schemaaQuery.run();

    const onSchemaUpdate = ({ results }: { results: EchoSchema[] }) => (this._schema = results);
    this._schemaSubscription = schemaaQuery.subscribe(onSchemaUpdate);
    onSchemaUpdate({ results: schemas });
    this._subscribe();

    return this;
  }

  async close(): Promise<this> {
    log('close');
    this._schemaSubscription?.();
    this._schemaSubscription = undefined;
    this._objectsSubscription?.();
    this._objectsSubscription = undefined;
    this._space = undefined;
    return this;
  }

  private _timeout?: NodeJS.Timeout;

  /**
   * Batch updates into same execution frame.
   */
  public invalidate() {
    clearTimeout(this._timeout);
    this._timeout = setTimeout(() => {
      if (this.isOpen()) {
        batch(() => {
          this._update();
        });
      }
    }, 0);
  }

  private _subscribe() {
    this._objectsSubscription?.();
    this._queueSubscription?.();

    invariant(this._space);
    this._objectsSubscription = this._space.db.query(Query.select(this._filter ?? defaultFilter)).subscribe(
      ({ objects }) => {
        this._objects = [...objects];
        this.invalidate();
      },
      { fire: true },
    );

    if (this._queue) {
      this._queueSubscription = effect(() => {
        const items = this._queue?.items;
        if (items) {
          this._queueItems = [...items];
        }
        this.invalidate();
      });
    }
  }

  private _update() {
    log('update', {
      nodes: this._graph.nodes.length,
      edges: this._graph.edges.length,
      objects: this._objects?.length,
      queueItems: this._queueItems?.length,
    });

    // TOOD(burdon): Merge edges also?
    const currentNodes: SpaceGraphNode[] = [...this._graph.nodes] as SpaceGraphNode[];

    // TOOD(burdon): Causes D3 graph to reset since live? Batch preact changes?
    this.clear();

    const addSchema = (typename: string) => {
      if (!this._options?.showSchema) {
        return;
      }

      if (typename) {
        let node = currentNodes.find((node) => node.id === typename);
        if (!node) {
          node = {
            id: typename,
            type: 'schema',
            data: {
              label: typename,
            },
          };
        }

        this._graph.nodes.push(node);
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
    [...(this._objects ?? []), ...(this._queueItems ?? [])].forEach((object) => {
      const schema = getSchema(object);
      if (!schema) {
        return;
      }

      // Relation.
      if (Relation.isRelation(object)) {
        const edge = this.addEdge({
          id: object.id,
          type: 'relation',
          source: Relation.getSource(object).id,
          target: Relation.getTarget(object).id,
          data: {
            object,
          },
        });

        this._options?.onCreateEdge?.(edge, object);
      } else {
        // Object.
        const typename = getSchemaDXN(schema)?.typename;
        if (typename) {
          let node: SpaceGraphNode | undefined = currentNodes.find((node) => node.id === object.id);
          if (!node) {
            node = {
              id: object.id,
              type: 'object',
              data: {
                object,
                label: getLabel(schema, object) ?? object.id,
              },
            };

            this._options?.onCreateNode?.(node, object);
          }

          this._graph.nodes.push(node);

          // Link to schema.
          if (this._options?.showSchema) {
            const schemaNode = this._graph.nodes.find(
              (node) => node.type === 'schema' && node.data.typename === typename,
            );
            if (!schemaNode) {
              log.warn('schema node not found', { typename });
            } else {
              this.addEdge({
                id: `${object.id}-${schemaNode.id}`,
                type: 'schema',
                source: object.id,
                target: schemaNode.id,
                data: {
                  force: false,
                },
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
              data: {
                force: true,
              },
            });
          }
        }
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
