//
// Copyright 2023 DXOS.org
//

import { untracked } from '@preact/signals-core';
import { type DeepSignal, deepSignal } from 'deepsignal/react';

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
  readonly _nodes = deepSignal<Record<string, NodeBase>>({
    [ROOT_ID]: { id: ROOT_ID, properties: {}, data: null },
  });

  /**
   * @internal
   */
  // Key is the `${node.id}-${direction}` and value is an ordered list of node ids.
  // Explicit type required because TS says this is not portable.
  readonly _edges: DeepSignal<Record<string, string[]>> = deepSignal({});

  get root() {
    return this.findNode(ROOT_ID)!;
  }

  toJSON(id = ROOT_ID) {
    const toJSON = (node: Node): any => {
      const nodes = node.nodes();
      const obj: Record<string, any> = { id: node.id.length > 35 ? `${node.id.slice(0, 32)}...` : node.id };
      if (node.properties.label) {
        obj.label = node.properties.label;
      }
      if (nodes.length) {
        obj.nodes = nodes.map((node) => toJSON(node));
      }
      return obj;
    };

    const root = this.findNode(id);
    invariant(root, `Node with id ${id} not found.`);
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

  // TODO(wittjosiah): Wrap mutators w/ `untracked` to avoid unexpected re-renders.

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
    const node = { data: null, properties: {}, ..._node };

    untracked(() => {
      this._nodes[node.id] = node;

      if (nodes) {
        nodes.forEach((subNode) => {
          this._addNode(subNode);
          this.addEdge(node.id, subNode.id);
        });
      }

      if (edges) {
        edges.forEach(([target, direction]) =>
          direction === 'outbound' ? this.addEdge(node.id, target) : this.addEdge(target, node.id),
        );
      }
    });

    return this._constructNode(node) as Node<TData, TProperties>;
  }

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
        this._getNodes({ id }).forEach((node) => this.removeEdge(id, node.id));
        this._getNodes({ id, direction: 'inbound' }).forEach((node) => this.removeEdge(node.id, id));
      }

      // Remove node.
      delete this._nodes[id];
    });
  }

  addEdge(from: string, to: string) {
    untracked(() => {
      const outbound = this._edges[this.getEdgeKey(from, 'outbound')];
      if (!outbound) {
        this._edges[this.getEdgeKey(from, 'outbound')] = [to];
      } else if (!outbound.includes(to)) {
        outbound.push(to);
      }

      const inbound = this._edges[this.getEdgeKey(to, 'inbound')];
      if (!inbound) {
        this._edges[this.getEdgeKey(to, 'inbound')] = [from];
      } else if (!inbound.includes(from)) {
        inbound.push(from);
      }
    });
  }

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

  removeEdge(from: string, to: string) {
    untracked(() => {
      const outboundIndex = this._edges[this.getEdgeKey(from, 'outbound')]?.findIndex((id) => id === to);
      if (outboundIndex !== -1) {
        this._edges[this.getEdgeKey(from, 'outbound')].splice(outboundIndex, 1);
      }

      const inboundIndex = this._edges[this.getEdgeKey(to, 'inbound')]?.findIndex((id) => id === from);
      if (inboundIndex !== -1) {
        this._edges[this.getEdgeKey(to, 'inbound')].splice(inboundIndex, 1);
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
  getPath({ from = 'root', to }: { from?: string; to: string }): string[] | undefined {
    const start = this.findNode(from);
    if (!start) {
      return undefined;
    }

    let found: string[] | undefined;
    this.traverse({
      node: start,
      filter: () => !found,
      visitor: (node, path) => {
        if (node.id === to) {
          found = path;
        }
      },
    });

    return found;
  }
}
