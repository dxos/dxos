//
// Copyright 2023 DXOS.org
//

import { type DeepSignal, deepSignal } from 'deepsignal/react';

import { invariant } from '@dxos/invariant';
import { nonNullable } from '@dxos/util';

import { type NodeBase } from './node';

export type EdgeDirection = 'outbound' | 'inbound';

export type TraversalOptions = {
  /**
   * The node to start traversing from.
   */
  node: Node;

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

export type Node<TData = any, TProperties extends Record<string, any> = Record<string, any>> = Readonly<
  Omit<NodeBase<TData, TProperties>, 'properties'> & {
    properties: Readonly<TProperties>;

    /**
     * Nodes that this node is connected to in default order.
     */
    nodes<T = any, U extends Record<string, any> = Record<string, any>>(params?: {
      direction?: EdgeDirection;
      parseNode?: (node: Node<unknown, Record<string, any>>, connectedNode: Node) => Node<T, U> | undefined;
    }): Node<T>[];

    /**
     * Get a specific connected node by id.
     */
    node(id: string): Node | undefined;
  }
>;

export type NodeArg<TData, TProperties extends Record<string, any> = Record<string, any>> = {
  id: NodeBase['id'];
  properties?: TProperties;
  data?: TData;
  /**
   * Will automatically add an edge.
   */
  nodes?: NodeArg<unknown>[];
};

/**
 * The Graph represents the structure of the application constructed via plugins.
 */
export class Graph {
  // Explicit type required because TS says this is not portable.
  /**
   * @internal
   */
  readonly _nodes: DeepSignal<NodeBase[]> = deepSignal([]);
  /**
   * @internal
   */
  // Key is the `${node.id}-${direction}` and value is an ordered list of node ids.
  readonly _edges: DeepSignal<Record<string, string[]>> = deepSignal({});

  toJSON(id = 'root') {
    const toJSON = (node: Node): any => {
      const nodes = node.nodes();
      const obj: Record<string, any> = { id: node.id.slice(0, 16) };
      if (node.properties.label) {
        obj.label = node.properties.label;
      }
      if (nodes.length) {
        obj.nodes = nodes.map((node) => toJSON(node));
      }
      return obj;
    };

    const root = this.getNode(id);
    invariant(root, `Node with id ${id} not found.`);
    return toJSON(root);
  }

  /**
   * Get the node with the given id in the graph.
   */
  getNode(id: string): Node | undefined {
    const nodeBase = this._nodes.find((node) => node.id === id);
    if (!nodeBase) {
      return undefined;
    }

    const node: Node = {
      ...nodeBase,
      // TODO(wittjosiah): add actions api?
      nodes: ({ direction, parseNode } = {}) => {
        const nodes = this._getNodes({ id, direction });
        return parseNode ? nodes.map((n) => parseNode(n, node)).filter(nonNullable) : nodes;
      },
      node: (id: string) => {
        const nodes = this._getNodes({ id });
        return nodes.find((node) => node.id === id);
      },
    };

    return node;
  }

  private _getNodes({ id, direction = 'outbound' }: { id: string; direction?: EdgeDirection }): Node[] {
    const edges = this._edges[this.getEdgeKey(id, direction)];
    if (!edges) {
      return [];
    }

    return edges.map((id) => this.getNode(id)).filter(nonNullable);
  }

  private getEdgeKey(id: string, direction: EdgeDirection) {
    return `${id}-${direction}`;
  }

  addNodes<TData = null, TProperties extends Record<string, any> = Record<string, any>>(
    ...nodes: NodeArg<TData, TProperties>[]
  ): Node<TData, TProperties>[] {
    return nodes.map((node) => this._addNode(node));
  }

  private _addNode<TData, TProperties extends Record<string, any> = Record<string, any>>({
    nodes,
    ...node
  }: NodeArg<TData, TProperties>): Node<TData, TProperties> {
    const index = this._nodes.findIndex(({ id }) => id === node.id);
    if (index === -1) {
      this._nodes.push({ data: null, properties: {}, ...node });
    } else {
      node.properties && this.addProperties(node.id, node.properties);
      node.data && (this._nodes[index].data = node.data);
    }

    if (nodes) {
      nodes.forEach((subNode) => {
        this._addNode(subNode);
        this.addEdge(node.id, subNode.id);
      });
    }

    return this.getNode(node.id) as Node<TData, TProperties>;
  }

  removeNode(id: string) {
    const node = this.getNode(id);
    if (!node) {
      return;
    }

    // Remove edges.
    this._getNodes({ id }).forEach((node) => this.removeEdge(id, node.id));
    this._getNodes({ id, direction: 'inbound' }).forEach((node) => this.removeEdge(node.id, id));

    // Remove node.
    const index = this._nodes.findIndex((node) => node.id === id);
    if (index !== -1) {
      this._nodes.splice(index, 1);
    }
  }

  addEdge(from: string, to: string) {
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
  }

  removeEdge(from: string, to: string) {
    const outboundIndex = this._edges[this.getEdgeKey(from, 'outbound')]?.findIndex((id) => id === to);
    if (outboundIndex !== -1) {
      this._edges[this.getEdgeKey(from, 'outbound')].splice(outboundIndex, 1);
    }

    const inboundIndex = this._edges[this.getEdgeKey(to, 'inbound')]?.findIndex((id) => id === from);
    if (inboundIndex !== -1) {
      this._edges[this.getEdgeKey(to, 'inbound')].splice(inboundIndex, 1);
    }
  }

  addProperties(nodeId: string, properties: Record<string, any>) {
    const node = this._nodes.find((node) => node.id === nodeId);
    if (node) {
      Object.entries(properties).forEach(([key, value]) => {
        node.properties[key] = value;
      });
    }
  }

  removeProperty(nodeId: string, key: string) {
    const node = this._nodes.find((node) => node.id === nodeId);
    delete node?.properties[key];
  }

  /**
   * Recursive breadth-first traversal.
   */
  traverse({ node, direction = 'outbound', filter, visitor }: TraversalOptions, path: string[] = []): void {
    // Break cycles.
    if (path.includes(node.id)) {
      return;
    }

    if (!filter || filter(node)) {
      visitor?.(node, [...path, node.id]);
    }

    Object.values(node.nodes({ direction })).forEach((child) =>
      this.traverse({ node: child, direction, filter, visitor }, [...path, node.id]),
    );
  }
}
