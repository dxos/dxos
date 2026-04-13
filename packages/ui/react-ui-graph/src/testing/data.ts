//
// Copyright 2020 DXOS.org
//

import { type Graph } from '@dxos/graph';
import { random } from '@dxos/random';

import { type TestNode } from './model';

// https://www.npmjs.com/package/random#setting-a-randomness-seed
export const seed = (seed: number) => random.seed(seed);

//
// Create data.
//

export const createNode = (type: string = undefined): TestNode => ({
  id: random.string.uuid(),
  type,
  label: random.lorem.words(3).replace(/ /g, '-'),
});

export const createNodes = (n = 0, types?: string[]): TestNode[] =>
  Array.from({ length: n }, () => createNode(types ? random.helpers.arrayElement(types) : undefined));

export const createEdge = (source: TestNode, target: TestNode): Graph.Edge.Any => ({
  id: `${source.id}-${target.id}`,
  source: source.id,
  target: target.id,
});

/**
 * Creates a random tree.
 * @param depth Depth of tree.
 * @param children Branching factor.
 */
export const createTree = ({ depth = 2, children = 3 } = {}): TestNode => {
  const createChildren = (root: TestNode, d = 0) => {
    if (d < depth) {
      const max = Math.round(Math.log(depth + 1 - d) * children);
      const num = random.number.int({ min: 1, max });
      root.children = [...new Array(num)].map(() => {
        return createChildren(createNode(), d + 1);
      });
    }

    return root;
  };

  return createChildren(createNode());
};

/**
 * Converts a tree into a graph.
 * @param root
 */
export const convertTreeToGraph = (root: TestNode): Graph.Any => {
  const traverse = (node: TestNode, graph: Graph.Any) => {
    graph.nodes.push(node);
    node.children?.forEach((child) => {
      graph.edges.push(createEdge(node, child));
      traverse(child, graph);
    });

    return graph;
  };

  return traverse(root, {
    nodes: [],
    edges: [],
  });
};

/**
 * Creates a random graph.
 * @param numNodes
 * @param numEdges
 */
export const createGraph = (numNodes = 0, numEdges = 0, types?: string[]): Graph.Any => {
  const nodes = createNodes(numNodes, types);

  const edges = new Map();
  if (numEdges && nodes.length >= 2) {
    for (let i = 0; i < numEdges; i++) {
      const source = random.helpers.arrayElement(nodes);
      const target = random.helpers.arrayElement(nodes);
      if (source.id !== target.id) {
        const edge = createEdge(source, target);
        if (!edges.get(edge.id)) {
          edges.set(edge.id, edge);
        }
      }
    }
  }

  return {
    nodes,
    edges: Array.from(edges.values()),
  };
};
