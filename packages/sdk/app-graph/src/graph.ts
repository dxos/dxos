//
// Copyright 2023 DXOS.org
//

import { batch, untracked } from '@preact/signals-core';

import { type ReactiveObject, create } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { nonNullable } from '@dxos/util';

import { type EdgeDirection, type Node, type NodeArg, type NodeBase } from './node';

export const ROOT_ID = 'root';
export const ROOT_TYPE = 'dxos.org/type/GraphRoot';
export const ACTION_TYPE = 'dxos.org/type/GraphAction';
export const ACTION_GROUP_TYPE = 'dxos.org/type/GraphActionGroup';

export type GraphTraversalOptions = {
  /**
   * The node to start traversing from.
   *
   * @default root
   */
  node?: Node;

  /**
   * The direction to traverse graph edges.
   *
   * @default 'outbound'
   */
  direction?: EdgeDirection;

  /**
   * A predicate to filter nodes which are passed to the `visitor` callback.
   */
  filter?: (node: Node) => boolean;

  /**
   * A callback which is called for each node visited during traversal.
   */
  visitor?: (node: Node, path: string[]) => void;
};

/**
 * The Graph represents the structure of the application constructed via plugins.
 */
export class Graph {
  private readonly _onInitialNode?: (id: string, type: string) => NodeArg<any> | undefined;
  private readonly _onInitialNodes?: (
    node: Node,
    direction: EdgeDirection,
    type?: string,
  ) => NodeArg<any>[] | undefined;

  private readonly _initialized: Record<string, boolean> = {};

  /**
   * @internal
   */
  readonly _nodes: Record<string, ReactiveObject<NodeBase>> = {
    [ROOT_ID]: create<NodeBase>({ id: ROOT_ID, type: ROOT_TYPE, properties: {}, data: null }),
  };

  /**
   * @internal
   */
  // Key is the `${node.id}-${direction}` and value is an ordered list of node ids.
  readonly _edges: Record<string, ReactiveObject<{ value: string[] }>> = {};

  constructor({
    onInitialNode,
    onInitialNodes,
  }: {
    onInitialNode?: Graph['_onInitialNode'];
    onInitialNodes?: Graph['_onInitialNodes'];
  } = {}) {
    this._onInitialNode = onInitialNode;
    this._onInitialNodes = onInitialNodes;
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
      const nodes = node.nodes();
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
  findNode(id: string, type?: string): Node | undefined {
    const nodeBase = this._nodes[id];
    if (!nodeBase && type && this._onInitialNode) {
      const nodeArg = this._onInitialNode(id, type);
      return nodeArg && this._addNode(nodeArg);
    } else if (!nodeBase) {
      return undefined;
    } else {
      return this._constructNode(nodeBase);
    }
  }

  /**
   * Recursive depth-first traversal of the currently in-memory graph.
   *
   * @param options.node The node to start traversing from.
   * @param options.direction The direction to traverse graph edges.
   * @param options.filter A predicate to filter nodes which are passed to the `visitor` callback.
   * @param options.visitor A callback which is called for each node visited during traversal.
   */
  traverse(
    { node = this.root, direction = 'outbound', filter, visitor }: GraphTraversalOptions,
    path: string[] = [],
  ): void {
    // Break cycles.
    if (path.includes(node.id)) {
      return;
    }

    if (!filter || filter(node)) {
      visitor?.(node, [...path, node.id]);
    }

    Object.values(this._getNodes({ node, direction, onlyLoaded: true })).forEach((child) =>
      this.traverse({ node: child, direction, filter, visitor }, [...path, node.id]),
    );
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
      filter: () => !found,
      visitor: (node, path) => {
        if (node.id === target) {
          found = path;
        }
      },
    });

    return found;
  }

  private _constructNode = (nodeBase: NodeBase): Node => {
    const node: Node = {
      ...nodeBase,
      edges: ({ direction = 'outbound' } = {}) => {
        return this._edges[this.getEdgeKey(node.id, direction)].value;
      },
      nodes: ({ onlyLoaded, direction, filter, type } = {}) => {
        const nodes = this._getNodes({ node, direction, type, onlyLoaded });
        return nodes.filter((n) => filter?.(n, node) ?? true);
      },
      node: (id: string) => {
        return this._getNodes({ node, onlyLoaded: true }).find((node) => node.id === id);
      },
      actions: () => {
        return [...this._getNodes({ node, type: ACTION_GROUP_TYPE }), ...this._getNodes({ node, type: ACTION_TYPE })];
      },
    };

    return node;
  };

  private _getNodes({
    node,
    direction = 'outbound',
    type,
    onlyLoaded,
  }: {
    node: Node;
    direction?: EdgeDirection;
    type?: string;
    onlyLoaded?: boolean;
  }): Node[] {
    const key = `${node.id}-${direction}-${type}`;
    const initialized = this._initialized[key];
    if (!initialized && !onlyLoaded && this._onInitialNodes) {
      const args = this._onInitialNodes(node, direction, type)?.filter((n) => !type || n.type === type);
      this._initialized[key] = true;
      if (args && args.length > 0) {
        const nodes = this._addNodes(args);
        this._addEdges(nodes.map(({ id }) => ({ source: node.id, target: id })));
        return nodes;
      } else {
        return [];
      }
    }

    const edges = this._edges[this.getEdgeKey(node.id, direction)];
    if (!edges) {
      return [];
    } else {
      return edges.value
        .map((id) => this.findNode(id))
        .filter(nonNullable)
        .filter((n) => !type || n.type === type);
    }
  }

  private getEdgeKey(id: string, direction: EdgeDirection) {
    return `${id}-${direction}`;
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
      const node = create<NodeBase>({ data: null, properties: {}, ..._node });
      this._nodes[node.id] = node;
      this._edges[this.getEdgeKey(node.id, 'outbound')] = create({ value: [] });
      this._edges[this.getEdgeKey(node.id, 'inbound')] = create({ value: [] });

      if (nodes) {
        nodes.forEach((subNode) => {
          this._addNode(subNode);
          this._addEdge({ source: node.id, target: subNode.id });
        });
      }

      if (edges) {
        edges.forEach(([id, direction]) =>
          direction === 'outbound'
            ? this._addEdge({ source: node.id, target: id })
            : this._addEdge({ source: id, target: node.id }),
        );
      }

      return this._constructNode(node) as Node<TData, TProperties>;
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
        this._getNodes({ node, onlyLoaded: true }).forEach((node) => {
          this._removeEdge({ source: id, target: node.id });
        });
        this._getNodes({ node, direction: 'inbound', onlyLoaded: true }).forEach((node) => {
          this._removeEdge({ source: node.id, target: id });
        });

        // Remove edges from node.
        delete this._edges[this.getEdgeKey(id, 'outbound')];
        delete this._edges[this.getEdgeKey(id, 'inbound')];
      }

      // Remove node.
      delete this._nodes[id];
    });
  }

  /**
   * Add an edge to the graph.
   *
   * @internal
   */
  _addEdges(edges: { source: string; target: string }[]) {
    batch(() => edges.forEach((edge) => this._addEdge(edge)));
  }

  private _addEdge({ source, target }: { source: string; target: string }) {
    untracked(() => {
      const outbound = this._edges[this.getEdgeKey(source, 'outbound')];
      if (!outbound) {
        this._edges[this.getEdgeKey(source, 'outbound')] = create({ value: [target] });
      } else if (!outbound.value.includes(target)) {
        outbound.value.push(target);
      }

      const inbound = this._edges[this.getEdgeKey(target, 'inbound')];
      if (!inbound) {
        this._edges[this.getEdgeKey(target, 'inbound')] = create({ value: [source] });
      } else if (!inbound.value.includes(source)) {
        inbound.value.push(source);
      }
    });
  }

  /**
   * Sort edges for a node.
   *
   * Edges not included in the sorted list are appended to the end of the list.
   *
   * @param nodeId The id of the node to sort edges for.
   * @param direction The direction of the edges from the node to sort.
   * @param edges The ordered list of edges.
   * @internal
   */
  _sortEdges(nodeId: string, direction: EdgeDirection, edges: string[]) {
    untracked(() => {
      batch(() => {
        const current = this._edges[this.getEdgeKey(nodeId, direction)];
        if (current) {
          const unsorted = current.value.filter((id) => !edges.includes(id)) ?? [];
          const sorted = edges.filter((id) => current.value.includes(id)) ?? [];
          current.value.splice(0, current.value.length, ...[...sorted, ...unsorted]);
        }
      });
    });
  }

  /**
   * Remove an edge from the graph.
   * @internal
   */
  _removeEdge({ source, target }: { source: string; target: string }) {
    untracked(() => {
      batch(() => {
        const outboundIndex = this._edges[this.getEdgeKey(source, 'outbound')]?.value.findIndex((id) => id === target);
        if (outboundIndex !== undefined && outboundIndex !== -1) {
          this._edges[this.getEdgeKey(source, 'outbound')].value.splice(outboundIndex, 1);
        }

        const inboundIndex = this._edges[this.getEdgeKey(target, 'inbound')]?.value.findIndex((id) => id === source);
        if (inboundIndex !== undefined && inboundIndex !== -1) {
          this._edges[this.getEdgeKey(target, 'inbound')].value.splice(inboundIndex, 1);
        }
      });
    });
  }
}
