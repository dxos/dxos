//
// Copyright 2023 DXOS.org
//

import { batch, effect, untracked } from '@preact/signals-core';

import { asyncTimeout, Trigger } from '@dxos/async';
import { type ReactiveObject, create } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { nonNullable } from '@dxos/util';

import { type Relation, type Node, type NodeArg, type NodeFilter, isActionLike } from './node';

const graphSymbol = Symbol('graph');
type DeepWriteable<T> = { -readonly [K in keyof T]: DeepWriteable<T[K]> };
type NodeInternal = DeepWriteable<Node> & { [graphSymbol]: Graph };

export const getGraph = (node: Node): Graph => {
  const graph = (node as NodeInternal)[graphSymbol];
  invariant(graph, 'Node is not associated with a graph.');
  return graph;
};

export const ROOT_ID = 'root';
export const ROOT_TYPE = 'dxos.org/type/GraphRoot';
export const ACTION_TYPE = 'dxos.org/type/GraphAction';
export const ACTION_GROUP_TYPE = 'dxos.org/type/GraphActionGroup';

export type NodesOptions<T = any, U extends Record<string, any> = Record<string, any>> = {
  relation?: Relation;
  filter?: NodeFilter<T, U>;
  expansion?: boolean;
  type?: string;
};

export type GraphTraversalOptions = {
  /**
   * A callback which is called for each node visited during traversal.
   *
   * If the callback returns `false`, traversal is stops recursing.
   */
  visitor: (node: Node, path: string[]) => boolean | void;

  /**
   * The node to start traversing from.
   *
   * @default root
   */
  node?: Node;

  /**
   * The relation to traverse graph edges.
   *
   * @default 'outbound'
   */
  relation?: Relation;

  /**
   * Allow traversal to trigger expansion of the graph via `onInitialNodes`.
   */
  expansion?: boolean;
};

/**
 * The Graph represents the structure of the application constructed via plugins.
 */
export class Graph {
  private readonly _onInitialNode?: (id: string) => Promise<void>;
  private readonly _onInitialNodes?: (node: Node, relation: Relation, type?: string) => Promise<void>;
  private readonly _onRemoveNode?: (id: string) => Promise<void>;

  private readonly _waitingForNodes: Record<string, Trigger<Node>> = {};
  private readonly _initialized: Record<string, boolean> = {};

  /**
   * @internal
   */
  readonly _nodes: Record<string, ReactiveObject<NodeInternal>> = {};

  /**
   * @internal
   */
  readonly _edges: Record<string, ReactiveObject<{ inbound: string[]; outbound: string[] }>> = {};

  constructor({
    onInitialNode,
    onInitialNodes,
    onRemoveNode,
  }: {
    onInitialNode?: Graph['_onInitialNode'];
    onInitialNodes?: Graph['_onInitialNodes'];
    onRemoveNode?: Graph['_onRemoveNode'];
  } = {}) {
    this._onInitialNode = onInitialNode;
    this._onInitialNodes = onInitialNodes;
    this._onRemoveNode = onRemoveNode;
    this._nodes[ROOT_ID] = this._constructNode({ id: ROOT_ID, type: ROOT_TYPE, properties: {}, data: null });
    this._edges[ROOT_ID] = create({ inbound: [], outbound: [] });
  }

  /**
   * Alias for `findNode('root')`.
   */
  get root() {
    return this.findNode(ROOT_ID)!;
  }

  /**
   * Convert the graph to a JSON object.
   */
  toJSON({ id = ROOT_ID, maxLength = 32 }: { id?: string; maxLength?: number } = {}) {
    const toJSON = (node: Node, seen: string[] = []): any => {
      const nodes = this.nodes(node);
      const obj: Record<string, any> = {
        id: node.id.length > maxLength ? `${node.id.slice(0, maxLength - 3)}...` : node.id,
        type: node.type,
      };
      if (node.properties.label) {
        obj.label = node.properties.label;
      }
      if (nodes.length) {
        obj.nodes = nodes
          .map((n) => {
            // Break cycles.
            const nextSeen = [...seen, node.id];
            return nextSeen.includes(n.id) ? undefined : toJSON(n, nextSeen);
          })
          .filter(nonNullable);
      }
      return obj;
    };

    const root = this.findNode(id);
    invariant(root, `Node not found: ${id}`);
    return toJSON(root);
  }

  /**
   * Find the node with the given id in the graph.
   *
   * If a node is not found within the graph and an `onInitialNode` callback is provided,
   * it is called with the id and type of the node, potentially initializing the node.
   */
  findNode(id: string): Node | undefined {
    const existingNode = this._nodes[id];
    if (!existingNode) {
      void this._onInitialNode?.(id);
    }

    return existingNode;
  }

  /**
   * Wait for a node to be added to the graph.
   *
   * If the node is already present in the graph, the promise resolves immediately.
   *
   * @param id The id of the node to wait for.
   * @param timeout The time in milliseconds to wait for the node to be added.
   */
  async waitForNode(id: string, timeout?: number): Promise<Node> {
    const trigger = this._waitingForNodes[id] ?? (this._waitingForNodes[id] = new Trigger<Node>());
    const node = this.findNode(id);
    if (node) {
      delete this._waitingForNodes[id];
      return node;
    }

    if (timeout === undefined) {
      return trigger.wait();
    } else {
      return asyncTimeout(trigger.wait(), timeout, `Node not found: ${id}`);
    }
  }

  /**
   * Nodes that this node is connected to in default order.
   */
  nodes<T = any, U extends Record<string, any> = Record<string, any>>(node: Node, options: NodesOptions<T, U> = {}) {
    const { relation, expansion, filter, type } = options;
    const nodes = this._getNodes({ node, relation, expansion, type });
    return nodes.filter((n) => untracked(() => !isActionLike(n))).filter((n) => filter?.(n, node) ?? true);
  }

  /**
   * Edges that this node is connected to in default order.
   */
  edges(node: Node, { relation = 'outbound' }: { relation?: Relation } = {}) {
    return this._edges[node.id]?.[relation] ?? [];
  }

  /**
   * Actions or action groups that this node is connected to in default order.
   */
  actions(node: Node, { expansion }: { expansion?: boolean } = {}) {
    return [
      ...this._getNodes({ node, expansion, type: ACTION_GROUP_TYPE }),
      ...this._getNodes({ node, expansion, type: ACTION_TYPE }),
    ];
  }

  async expand(node: Node, relation: Relation = 'outbound', type?: string) {
    const key = this._key(node, relation, type);
    const initialized = this._initialized[key];
    if (!initialized && this._onInitialNodes) {
      await this._onInitialNodes(node, relation, type);
      this._initialized[key] = true;
    }
  }

  private _key(node: Node, relation: Relation, type?: string) {
    return `${node.id}-${relation}-${type}`;
  }

  /**
   * Recursive depth-first traversal of the graph.
   *
   * @param options.node The node to start traversing from.
   * @param options.relation The relation to traverse graph edges.
   * @param options.visitor A callback which is called for each node visited during traversal.
   */
  traverse(
    { visitor, node = this.root, relation = 'outbound', expansion }: GraphTraversalOptions,
    path: string[] = [],
  ): void {
    // Break cycles.
    if (path.includes(node.id)) {
      return;
    }

    const shouldContinue = visitor(node, [...path, node.id]);
    if (shouldContinue === false) {
      return;
    }

    Object.values(this._getNodes({ node, relation, expansion })).forEach((child) =>
      this.traverse({ node: child, relation, visitor, expansion }, [...path, node.id]),
    );
  }

  /**
   * Recursive depth-first traversal of the graph wrapping each visitor call in an effect.
   *
   * @param options.node The node to start traversing from.
   * @param options.relation The relation to traverse graph edges.
   * @param options.visitor A callback which is called for each node visited during traversal.
   */
  subscribeTraverse(
    { visitor, node = this.root, relation = 'outbound', expansion }: GraphTraversalOptions,
    currentPath: string[] = [],
  ) {
    return effect(() => {
      const path = [...currentPath, node.id];
      const result = visitor(node, path);
      if (result === false) {
        return;
      }

      const nodes = this._getNodes({ node, relation, expansion });
      const nodeSubscriptions = nodes.map((n) => this.subscribeTraverse({ node: n, visitor, expansion }, path));

      return () => {
        nodeSubscriptions.forEach((unsubscribe) => unsubscribe());
      };
    });
  }

  /**
   * Get the path between two nodes in the graph.
   */
  getPath({ source = 'root', target }: { source?: string; target: string }): string[] | undefined {
    const start = this.findNode(source);
    if (!start) {
      return undefined;
    }

    let found: string[] | undefined;
    this.traverse({
      node: start,
      visitor: (node, path) => {
        if (found) {
          return false;
        }

        if (node.id === target) {
          found = path;
        }
      },
    });

    return found;
  }

  /**
   * Add nodes to the graph.
   *
   * @internal
   */
  _addNodes<TData = null, TProperties extends Record<string, any> = Record<string, any>>(
    nodes: NodeArg<TData, TProperties>[],
  ): Node<TData, TProperties>[] {
    return batch(() => nodes.map((node) => this._addNode(node)));
  }

  private _addNode<TData, TProperties extends Record<string, any> = Record<string, any>>({
    nodes,
    edges,
    ..._node
  }: NodeArg<TData, TProperties>): Node<TData, TProperties> {
    return untracked(() => {
      const existingNode = this._nodes[_node.id];
      const node = existingNode ?? this._constructNode({ data: null, properties: {}, ..._node });
      if (existingNode) {
        const { data, properties, type } = _node;
        if (data && data !== node.data) {
          node.data = data;
        }

        if (type !== node.type) {
          node.type = type;
        }

        for (const key in properties) {
          if (properties[key] !== node.properties[key]) {
            node.properties[key] = properties[key];
          }
        }
      } else {
        this._nodes[node.id] = node;
        this._edges[node.id] = create({ inbound: [], outbound: [] });
      }

      const trigger = this._waitingForNodes[node.id];
      if (trigger) {
        trigger.wake(node);
        delete this._waitingForNodes[node.id];
      }

      if (nodes) {
        nodes.forEach((subNode) => {
          this._addNode(subNode);
          this._addEdge({ source: node.id, target: subNode.id });
        });
      }

      if (edges) {
        edges.forEach(([id, relation]) =>
          relation === 'outbound'
            ? this._addEdge({ source: node.id, target: id })
            : this._addEdge({ source: id, target: node.id }),
        );
      }

      return node as unknown as Node<TData, TProperties>;
    });
  }

  /**
   * Remove nodes from the graph.
   *
   * @param ids The id of the node to remove.
   * @param edges Whether to remove edges connected to the node from the graph as well.
   * @internal
   */
  _removeNodes(ids: string[], edges = false) {
    batch(() => ids.forEach((id) => this._removeNode(id, edges)));
  }

  private _removeNode(id: string, edges = false) {
    untracked(() => {
      const node = this.findNode(id);
      if (!node) {
        return;
      }

      if (edges) {
        // Remove edges from connected nodes.
        this._getNodes({ node }).forEach((node) => {
          this._removeEdge({ source: id, target: node.id });
        });
        this._getNodes({ node, relation: 'inbound' }).forEach((node) => {
          this._removeEdge({ source: node.id, target: id });
        });

        // Remove edges from node.
        delete this._edges[id];
      }

      // Remove node.
      delete this._nodes[id];
      Object.keys(this._initialized)
        .filter((key) => key.startsWith(id))
        .forEach((key) => {
          delete this._initialized[key];
        });
      void this._onRemoveNode?.(id);
    });
  }

  /**
   * Add edges to the graph.
   *
   * @internal
   */
  _addEdges(edges: { source: string; target: string }[]) {
    batch(() => edges.forEach((edge) => this._addEdge(edge)));
  }

  private _addEdge({ source, target }: { source: string; target: string }) {
    untracked(() => {
      if (!this._edges[source]) {
        this._edges[source] = create({ inbound: [], outbound: [] });
      }
      if (!this._edges[target]) {
        this._edges[target] = create({ inbound: [], outbound: [] });
      }

      const sourceEdges = this._edges[source];
      if (!sourceEdges.outbound.includes(target)) {
        sourceEdges.outbound.push(target);
      }

      const targetEdges = this._edges[target];
      if (!targetEdges.inbound.includes(source)) {
        targetEdges.inbound.push(source);
      }
    });
  }

  /**
   * Remove edges from the graph.
   * @internal
   */
  _removeEdges(edges: { source: string; target: string }[]) {
    batch(() => edges.forEach((edge) => this._removeEdge(edge)));
  }

  private _removeEdge({ source, target }: { source: string; target: string }) {
    untracked(() => {
      batch(() => {
        const outboundIndex = this._edges[source]?.outbound.findIndex((id) => id === target);
        if (outboundIndex !== undefined && outboundIndex !== -1) {
          this._edges[source].outbound.splice(outboundIndex, 1);
        }

        const inboundIndex = this._edges[target]?.inbound.findIndex((id) => id === source);
        if (inboundIndex !== undefined && inboundIndex !== -1) {
          this._edges[target].inbound.splice(inboundIndex, 1);
        }
      });
    });
  }

  /**
   * Sort edges for a node.
   *
   * Edges not included in the sorted list are appended to the end of the list.
   *
   * @param nodeId The id of the node to sort edges for.
   * @param relation The relation of the edges from the node to sort.
   * @param edges The ordered list of edges.
   * @ignore
   */
  _sortEdges(nodeId: string, relation: Relation, edges: string[]) {
    untracked(() => {
      batch(() => {
        const current = this._edges[nodeId];
        if (current) {
          const unsorted = current[relation].filter((id) => !edges.includes(id)) ?? [];
          const sorted = edges.filter((id) => current[relation].includes(id)) ?? [];
          current[relation].splice(0, current[relation].length, ...[...sorted, ...unsorted]);
        }
      });
    });
  }

  private _constructNode = (node: Omit<Node, typeof graphSymbol>) => {
    return create<NodeInternal>({ ...node, [graphSymbol]: this });
  };

  private _getNodes({
    node,
    relation = 'outbound',
    type,
    expansion,
  }: {
    node: Node;
    relation?: Relation;
    type?: string;
    expansion?: boolean;
  }): Node[] {
    if (expansion) {
      void this.expand(node, relation, type);
    }

    const edges = this._edges[node.id];
    if (!edges) {
      return [];
    } else {
      return edges[relation]
        .map((id) => this._nodes[id])
        .filter(nonNullable)
        .filter((n) => !type || n.type === type);
    }
  }
}
