//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type CleanupFn } from '@dxos/async';
import { type Database, Entity, Filter, Obj, Query, Ref, Relation, Type } from '@dxos/echo';
import { type Graph, GraphModel } from '@dxos/graph';
import { invariant } from '@dxos/invariant';
import { EchoURI } from '@dxos/keys';
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
  object?: Obj.Unknown;
}>;

// TODO(burdon): Differentiate between refs and relations.
export type SpaceGraphEdge = Graph.Edge.Any;

class SpaceGraphBuilder extends GraphModel.AbstractBuilder<SpaceGraphNode, SpaceGraphEdge, SpaceGraphModel> {}

const defaultFilter: Filter.Any = Filter.everything();

const truncate = (id: string) => `${id.slice(0, 4)}…${id.slice(-4)}`;

export type SpaceGraphModelOptions = {
  showSchema?: boolean;
  onCreateNode?: (node: SpaceGraphNode, object: Obj.Unknown) => void;
  onCreateEdge?: (edge: SpaceGraphEdge, relation: Relation.Unknown) => void;
};

/**
 * Converts ECHO objects to a graph.
 */
export class SpaceGraphModel extends GraphModel.ReactiveGraphModel<SpaceGraphNode, SpaceGraphEdge> {
  private _options?: SpaceGraphModelOptions;
  private _filter?: Filter.Any;
  private _db?: Database.Database;
  private _schema?: Type.AnyEntity[];
  private _objects?: Entity.Unknown[];
  private _extraItems?: Entity.Unknown[];
  private _schemaSubscription?: CleanupFn;
  private _objectSubscription?: CleanupFn;
  private _timeout?: NodeJS.Timeout;

  override get builder() {
    return new SpaceGraphBuilder(this);
  }

  override copy(graph?: Partial<Graph.Graph<SpaceGraphNode, SpaceGraphEdge>>): SpaceGraphModel {
    return new SpaceGraphModel(this.registry, graph);
  }

  get objects(): Entity.Unknown[] {
    return this._objects ?? [];
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

  /**
   * Supplement the DB graph with items sourced externally (e.g. from a Feed).
   * Callers drive this from a reactive snapshot (e.g. `useQuery(db, Query.select(...).from(feed))`).
   */
  setItems(items: readonly Entity.Unknown[] | undefined): this {
    this._extraItems = items ? [...items] : undefined;
    if (this.isOpen()) {
      this.invalidate();
    }

    return this;
  }

  async open(db: Database.Database): Promise<this> {
    log('open', { db });
    if (this.isOpen()) {
      await this.close();
    }

    this._db = db;

    this._schema = [...Effect.runSync(db.graph.registry.listTypes())] as Type.RuntimeType[];
    this._schemaSubscription = db.graph.registry.changed.on(() => {
      this._schema = [...Effect.runSync(db.graph.registry.listTypes())] as Type.RuntimeType[];
    });

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
        try {
          this._update();
        } catch (err) {
          log.catch(err);
        }
      }
    });
  }

  private _subscribeObjects() {
    this._objectSubscription?.();

    invariant(this._db);
    this._objectSubscription = this._db.query(Query.select(this._filter ?? defaultFilter)).subscribe(
      (query) => {
        log('update', { objects: query.results.length });
        this._objects = [...query.results];
        this.invalidate();
      },
      { fire: true },
    );
  }

  private _update() {
    log('update', {
      nodes: this._graph.nodes.length,
      edges: this._graph.edges.length,
      objects: this._objects?.length,
      extraItems: this._extraItems?.length,
    });

    // TOOD(burdon): Merge edges also?
    const currentNodes: SpaceGraphNode[] = [...this._graph.nodes] as SpaceGraphNode[];

    // Build new graph state locally, then set it all at once.
    const newNodes: SpaceGraphNode[] = [];
    const newEdges: SpaceGraphEdge[] = [];

    // Schema nodes.
    if (this._options?.showSchema) {
      this._schema?.forEach((schema) => {
        const typename = Type.getTypename(schema);
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

          newNodes.push(node);
        }
      });
    }

    // Database Objects and Relations.
    const objects = [
      // ECHO Graph.
      ...(this._objects ?? []),
      // Externally-supplied items (e.g. Feed contents).
      ...(this._extraItems ?? []),
    ];

    objects.forEach((object) => {
      const type = Entity.getType(object);
      const schema = type != null ? Type.getSchema(type) : undefined;

      // Relations.
      if (Relation.isRelation(object)) {
        const edge: SpaceGraphEdge = {
          id: object.id,
          type: 'relation',
          source: EchoURI.getObjectId(EchoURI.tryParse(Relation.getSourceURI(object))!)!,
          target: EchoURI.getObjectId(EchoURI.tryParse(Relation.getTargetURI(object))!)!,
          data: {
            object,
          },
        };

        newEdges.push(edge);
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

          newNodes.push(node);

          // Link to schema.
          if (this._options?.showSchema) {
            const schemaNode = newNodes.find(
              (node) => node.type === 'schema' && node.data.object && Obj.getTypename(node.data.object) === typename,
            );
            if (!schemaNode) {
              log.warn('schema node not found', { typename });
            } else {
              newEdges.push({
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

          // Link to refs.
          const refs = getOutgoingReferences(object);
          for (const ref of refs) {
            if (!Obj.isObject(ref.target)) {
              continue;
            }

            newEdges.push({
              id: `${object.id}-${ref.uri}`,
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

    // Set the entire graph at once to trigger a single notification.
    this.setGraph({ nodes: newNodes, edges: newEdges });
  }
}

const getOutgoingReferences = (object: Obj.Unknown): Ref.Unknown[] => {
  const refs: Ref.Unknown[] = [];
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
