//
// Copyright 2023 DXOS.org
//

import { GraphImpl } from './graph';
import { Graph } from './types';

/**
 * Create a test node builder that always adds nodes and actions to the specified depth.
 *
 * @param id The id of the node builder, used to identify nodes created by this builder.
 * @param depth The depth at which to add nodes and actions.
 * @default 1
 *
 * @returns A test node builder
 */
// TODO(burdon): Change to TestNodeBuilder class (see other builder/generator patterns in client/echo).
export const createTestNodeBuilder = (id: string, depth = 1) => {
  const nodes = new Map<string, Graph.Node>();
  const nodeBuilder: Graph.NodeBuilder = (parent) => {
    if (checkDepth(parent) >= depth) {
      return;
    }

    const [child] = parent.addNode(id, {
      id: `${parent.id}-${id}`,
      label: `${parent.id}-${id}`,
      data: null,
      parent,
    });

    parent.addAction({
      id: `${parent.id}-${id}`,
      label: `${parent.id}-${id}`,
      intent: { action: 'test' },
    });

    nodes.set(parent.id, parent);
    nodes.set(child.id, child);
  };

  const addNode = (parentId: string, node: Pick<Graph.Node, 'id' | 'label'> & Partial<Graph.Node>) => {
    const parent = nodes.get(parentId);
    if (!parent) {
      return;
    }

    const [child] = parent.addNode(id, node);
    nodes.set(child.id, child);
    return child;
  };

  const removeNode = (parentId: string, id: string) => {
    const parent = nodes.get(parentId);
    if (!parent) {
      return;
    }

    return parent.removeNode(id);
  };

  const addAction = (parentId: string, action: Pick<Graph.Action, 'id' | 'label'> & Partial<Graph.Action>) => {
    const parent = nodes.get(parentId);
    if (!parent) {
      return;
    }

    return parent.addAction(action);
  };

  const removeAction = (parentId: string, id: string) => {
    const parent = nodes.get(parentId);
    if (!parent) {
      return;
    }

    return parent.removeAction(id);
  };

  const addProperty = (parentId: string, key: string, value: any) => {
    const parent = nodes.get(parentId);
    if (!parent) {
      return;
    }

    return parent.addProperty(key, value);
  };

  const removeProperty = (parentId: string, key: string) => {
    const parent = nodes.get(parentId);
    if (!parent) {
      return;
    }

    return parent.removeProperty(key);
  };

  return { nodeBuilder, addNode, removeNode, addAction, removeAction, addProperty, removeProperty };
};

/**
 * Build a graph from a nested list of nodes.
 *
 * @param graph Graph to add nodes to.
 * @param nodes Nodes to add to the graph.
 *
 * @example
 * const graph = new GraphStore();
 * buildGraph(graph, [
 *   {
 *     id: 'test1',
 *     label: 'test1',
 *     children: [
 *       {
 *         id: 'test1.1',
 *         label: 'test1.1',
 *       },
 *       {
 *         id: 'test1.2',
 *         label: 'test1.2',
 *       },
 *     ],
 *   },
 *   {
 *     id: 'test2',
 *     label: 'test2',
 *   },
 * ]);
 */

// TODO(wittjosiah): Type nodes.
export const buildGraph = (graph: GraphImpl, nodes: any[]) => {
  addNodes(graph.root, nodes);
};

const addNodes = (root: Graph.Node, nodes: any[]) => {
  nodes.forEach((node) => {
    const [child] = root.addNode(node);
    addNodes(child, node.children || []);
    node.actions?.forEach((action: any) => child.addAction(action));
  });
};

const checkDepth = (node: Graph.Node, depth = 0): number => {
  if (!node.parent) {
    return depth;
  }

  return checkDepth(node.parent, depth + 1);
};
