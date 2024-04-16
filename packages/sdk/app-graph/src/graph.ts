//
// Copyright 2023 DXOS.org
//

import { untracked } from '@preact/signals-core';

import { create } from '@dxos/echo-schema/schema';
import { invariant } from '@dxos/invariant';
import { nonNullable } from '@dxos/util';

import { isActionLike, type EdgeDirection, type Node, type NodeArg, type NodeBase } from './node';

export const ROOT_ID = 'root';

export type TraversalOptions = {
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
  /**
   * @internal
   */
  readonly _nodes = create<Record<string, NodeBase>>({
    [ROOT_ID]: { id: ROOT_ID, properties: {}, data: null },
  });

  /**
   * @internal
   */
  // Key is the `${node.id}-${direction}` and value is an ordered list of node ids.
  // Explicit type required because TS says this is not portable.
  readonly _edges = create<Record<string, string[]>>({});

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
    const toJSON = (node: Node): any => {
      const nodes = node.nodes();
      const obj: Record<string, any> = {
        id: node.id.length > maxLength ? `${node.id.slice(0, maxLength - 3)}...` : node.id,
      };
      if (node.properties.label) {
        obj.label = node.properties.label;
      }
      if (nodes.length) {
        obj.nodes = nodes.map((node) => toJSON(node));
      }
      return obj;
    };

    const root = this.findNode(id);
    invariant(root, `Node not found: ${id}`);
    return toJSON(root);
  }

  /**
   * Find the node with the given id in the graph.
   */
  findNode(id: string): Node | undefined {
    const nodeBase = this._nodes[id];
    if (!nodeBase) {
      return undefined;
    }

    return this._constructNode(nodeBase);
  }

  private _constructNode = (nodeBase: NodeBase): Node => {
    const node: Node = {
      ...nodeBase,
      edges: ({ direction = 'outbound' } = {}) => {
        return this._edges[this.getEdgeKey(node.id, direction)];
      },
      nodes: ({ direction, filter } = {}) => {
        const nodes = this._getNodes({ id: node.id, direction }).filter((n) => !isActionLike(n));
        return filter ? nodes.filter((n) => filter(n, node)) : nodes;
      },
      node: (id: string) => {
        return this._getNodes({ id }).find((node) => node.id === id);
      },
      actions: () => {
        return this._getNodes({ id: node.id }).filter(isActionLike);
      },
    };

    return node;
  };

  private _getNodes({ id, direction = 'outbound' }: { id: string; direction?: EdgeDirection }): Node[] {
    const edges = this._edges[this.getEdgeKey(id, direction)];
    if (!edges) {
      return [];
    }

    return edges.map((id) => this.findNode(id)).filter(nonNullable);
  }

  private getEdgeKey(id: string, direction: EdgeDirection) {
    return `${id}-${direction}`;
  }

  /**
   * Add nodes to the graph.
   */
  addNodes<TData = null, TProperties extends Record<string, any> = Record<string, any>>(
    ...nodes: NodeArg<TData, TProperties>[]
  ): Node<TData, TProperties>[] {
    return nodes.map((node) => this._addNode(node));
  }

  private _addNode<TData, TProperties extends Record<string, any> = Record<string, any>>({
    nodes,
    edges,
    ..._node
  }: NodeArg<TData, TProperties>): Node<TData, TProperties> {
    return untracked(() => {
      const node = { data: null, properties: {}, ..._node };
      this._nodes[node.id] = node;

      if (nodes) {
        nodes.forEach((subNode) => {
          this._addNode(subNode);
          this.addEdge({ source: node.id, target: subNode.id });
        });
      }

      if (edges) {
        edges.forEach(([id, direction]) =>
          direction === 'outbound'
            ? this.addEdge({ source: node.id, target: id })
            : this.addEdge({ source: id, target: node.id }),
        );
      }

      return this._constructNode(node) as Node<TData, TProperties>;
    });
  }

  /**
   * Remove nodes from the graph.
   *
   * @param id The id of the node to remove.
   * @param edges Whether to remove edges connected to the node from the graph as well.
   */
  removeNode(id: string, edges = false) {
    untracked(() => {
      const node = this.findNode(id);
      if (!node) {
        return;
      }

      if (edges) {
        // Remove edges from node.
        delete this._edges[this.getEdgeKey(id, 'outbound')];
        delete this._edges[this.getEdgeKey(id, 'inbound')];

        // Remove edges from connected nodes.
        this._getNodes({ id }).forEach((node) => this.removeEdge({ source: id, target: node.id }));
        this._getNodes({ id, direction: 'inbound' }).forEach((node) =>
          this.removeEdge({ source: node.id, target: id }),
        );
      }

      // Remove node.
      delete this._nodes[id];
    });
  }

  /**
   * Add an edge to the graph.
   */
  addEdge({ source, target }: { source: string; target: string }) {
    untracked(() => {
      const outbound = this._edges[this.getEdgeKey(source, 'outbound')];
      if (!outbound) {
        this._edges[this.getEdgeKey(source, 'outbound')] = [target];
      } else if (!outbound.includes(target)) {
        outbound.push(target);
      }

      const inbound = this._edges[this.getEdgeKey(target, 'inbound')];
      if (!inbound) {
        this._edges[this.getEdgeKey(target, 'inbound')] = [source];
      } else if (!inbound.includes(source)) {
        inbound.push(source);
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
   */
  sortEdges(nodeId: string, direction: EdgeDirection, edges: string[]) {
    untracked(() => {
      const current = this._edges[this.getEdgeKey(nodeId, direction)];
      if (current) {
        const unsorted = current.filter((id) => !edges.includes(id)) ?? [];
        const sorted = edges.filter((id) => current.includes(id)) ?? [];
        current.splice(0, current.length, ...[...sorted, ...unsorted]);
      }
    });
  }

  /**
   * Remove an edge from the graph.
   */
  removeEdge({ source, target }: { source: string; target: string }) {
    untracked(() => {
      const outboundIndex = this._edges[this.getEdgeKey(source, 'outbound')]?.findIndex((id) => id === target);
      if (outboundIndex !== -1) {
        this._edges[this.getEdgeKey(source, 'outbound')].splice(outboundIndex, 1);
      }

      const inboundIndex = this._edges[this.getEdgeKey(target, 'inbound')]?.findIndex((id) => id === source);
      if (inboundIndex !== -1) {
        this._edges[this.getEdgeKey(target, 'inbound')].splice(inboundIndex, 1);
      }
    });
  }

  /**
   * Recursive depth-first traversal.
   *
   * @param options.node The node to start traversing from.
   * @param options.direction The direction to traverse graph edges.
   * @param options.filter A predicate to filter nodes which are passed to the `visitor` callback.
   * @param options.visitor A callback which is called for each node visited during traversal.
   */
  traverse({ node = this.root, direction = 'outbound', filter, visitor }: TraversalOptions, path: string[] = []): void {
    // Break cycles.
    if (path.includes(node.id)) {
      return;
    }

    if (!filter || filter(node)) {
      visitor?.(node, [...path, node.id]);
    }

    Object.values(this._getNodes({ id: node.id, direction })).forEach((child) =>
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
}
