//
// Copyright 2026 DXOS.org
//

import { defaultEdgeHandler, defaultNodeHandler } from './default-handlers';
import { type EdgeHandler, type NodeHandler } from './handlers';

/**
 * Minimum shape resolveNode/resolveEdge need from input. Any object with optional `type`.
 * Compatible with both `Graph.Node.Any` / `Graph.Edge.Any` from @dxos/graph and our LayoutNode/LayoutEdge.
 */
type Typed = { id: string; type?: string };

/**
 * Maps node/edge `type` to its handler. Resolves to a built-in default when missing.
 */
export class TypeRegistry<NodeData = any, EdgeData = any> {
  #nodes = new Map<string, NodeHandler<NodeData>>();
  #edges = new Map<string, EdgeHandler<NodeData, EdgeData>>();

  registerNode(type: string, handler: NodeHandler<NodeData>): void {
    this.#nodes.set(type, handler);
  }

  registerEdge(type: string, handler: EdgeHandler<NodeData, EdgeData>): void {
    this.#edges.set(type, handler);
  }

  resolveNode(node: Typed): NodeHandler<NodeData> {
    return (node.type ? this.#nodes.get(node.type) : undefined) ?? (defaultNodeHandler as NodeHandler<NodeData>);
  }

  resolveEdge(edge: Typed): EdgeHandler<NodeData, EdgeData> {
    return (
      (edge.type ? this.#edges.get(edge.type) : undefined) ?? (defaultEdgeHandler as EdgeHandler<NodeData, EdgeData>)
    );
  }
}
