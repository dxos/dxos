//
// Copyright 2023 DXOS.org
//

import { batch, effect } from '@preact/signals-core';

import { type CleanupFn } from '@dxos/async';
import { type Database, type Entity, Filter, Obj, Query, Ref, Relation, Type } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { type Graph, GraphModel } from '@dxos/graph';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { visitValues } from '@dxos/util';

// TODO(burdon): Alternative diagram types:
// - https://observablehq.com/@d3/radial-tree/2
// - https://observablehq.com/@d3/disjoint-force-directed-graph/2
// - https://observablehq.com/@mbostock/tadpoles
// - https://observablehq.com/@d3/psr-b1919-21
// - https://vasturiano.github.io/react-force-graph/example/basic (3D)

export type SpaceGraphNode = Graph.Node.Node<{
  label: string;
  object?: Obj.source;
}>;

// TODO(burdon): Differentiate between refs and relations.
export type SpaceGraphEdge = Graph.Edge.Any;

class SpaceGraphBuilder extends GraphModel.AbstractBuilder<SpaceGraphNode, SpaceGraphEdge, SpaceGraphModel> {}

const defaultFilter: Filter.Any = Filter.everything();

const truncate = (id: string) => `${id.slice(0, 4)}…${id.slice(-4)}`;

export type SpaceGraphModelOptions = {
  showSchema?: boolean;
  onCreateNode?: (node: SpaceGraphNode, object: Obj.source) => void;
  onCreateEdge?: (edge: SpaceGraphEdge, relation: Relation.Any) => void;
};

/**
 * Converts ECHO objects to a graph.
 */
export class SpaceGraphModel extends GraphModel.ReactiveGraphModel<SpaceGraphNode, SpaceGraphEdge> {
  private _options?: SpaceGraphModelOptions;
  private _filter?: Filter.Any;
  private _db?: Database.Database;
  private _queue?: Queue;
  private _schema?: Type.RuntimeType[];
  private _objects?: Entity.Unknown[];
  private _queueItems?: Entity.Unknown[];
  private _schemaSubscription?: CleanupFn;
  private _objectSubscription?: CleanupFn;
  private _queueSubscription?: CleanupFn;
  private _timeout?: NodeJS.Timeout;

  override get builder() {
    return new SpaceGraphBuilder(this);
  }

  override copy(graph?: Partial<Graph.Graph<SpaceGraphNode, SpaceGraphEdge>>): SpaceGraphModel {
    return new SpaceGraphModel(graph);
  }

  get objects(): Entity.Unknown[] {
    return this._objects ?? [];
  }

  get queue(): Queue | undefined {
    return this._queue;
  }

  isOpen() {
    return this._db !== undefined;
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
      this._subscribeObjects();
    }

    return this;
  }

  async open(db: Database.Database, queue?: Queue): Promise<this> {
    log('open', { db, queue });
    if (this.isOpen()) {
      await this.close();
    }

    this._db = db;
    this._queue = queue;

    const schemaaQuery = db.schemaRegistry.query({});
    this._schemaSubscription = schemaaQuery.subscribe(
      ({ results }: { results: Type.RuntimeType[] }) => (this._schema = results),
      { fire: true },
    );

    this._subscribeObjects();

    return this;
  }

  async close(): Promise<this> {
    log('close');

    this._schemaSubscription?.();
    this._schemaSubscription = undefined;
    this._objectSubscription?.();
    this._objectSubscription = undefined;
    this._db = undefined;

    return this;
  }

  /**
   * Batch updates into same execution frame.
   */
  public invalidate() {
    clearTimeout(this._timeout);
    this._timeout = setTimeout(() => {
      if (this.isOpen()) {
        batch(() => {
          try {
            this._update();
          } catch (err) {
            log.catch(err);
          }
        });
      }
    });
  }

  private _subscribeObjects() {
    this._objectSubscription?.();
    this._queueSubscription?.();

    invariant(this._db);
    this._objectSubscription = this._db.query(Query.select(this._filter ?? defaultFilter)).subscribe(
      (query) => {
        log('update', { objects: query.results.length });
        this._objects = [...query.results];
        this.invalidate();
      },
      { fire: true },
    );

    if (this._queue) {
      const clearEffect = effect(() => {
        const items = this._queue?.objects;
        if (items) {
          this._queueItems = [...items];
        }
        this.invalidate();
      });
      const pollingTask = setInterval(() => {
        void this._queue?.refresh();
      }, 1000);

      this._queueSubscription = () => {
        clearEffect();
        clearInterval(pollingTask);
      };
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

    // Schema nodes.
    if (this._options?.showSchema) {
      this._schema?.forEach((schema) => {
        const typename = Type.getDXN(schema)?.typename;
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
      });
    }

    // Database Objects and Relations.
    const objects = [
      // ECHO Graph.
      ...(this._objects ?? []),
      // ECHO Queue.
      ...(this._queueItems ?? []),
    ];

    objects.forEach((object) => {
      const schema = Obj.getSchema(object);

      // Relations.
      if (Relation.isRelation(object)) {
        const edge = this.addEdge({
          id: object.id,
          type: 'relation',
          source: Relation.getSourceDXN(object).asEchoDXN()!.echoId,
          target: Relation.getTargetDXN(object).asEchoDXN()!.echoId,
          data: {
            object,
          },
        });

        this._options?.onCreateEdge?.(edge, object);
      } else if (Obj.isObject(object)) {
        const typename = Obj.getTypename(object);
        if (typename) {
          let node: SpaceGraphNode | undefined = currentNodes.find((node) => node.id === object.id);
          if (!node) {
            node = {
              id: object.id,
              type: 'object',
              data: {
                object,
                label: (schema && Obj.getLabel(object)) ?? Obj.getTypename(object) + '/' + truncate(object.id),
              },
            };

            this._options?.onCreateNode?.(node, object);
          }

          this._graph.nodes.push(node);

          // Link to schema.
          if (this._options?.showSchema) {
            const schemaNode = this._graph.nodes.find(
              (node) => node.type === 'schema' && node.data.object && Obj.getTypename(node.data.object) === typename,
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
            if (!Obj.isObject(ref.target)) {
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

const getOutgoingReferences = (object: Obj.source): Ref.Any[] => {
  const refs: Ref.Any[] = [];
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
