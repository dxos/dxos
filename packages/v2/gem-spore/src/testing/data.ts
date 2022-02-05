//
// Copyright 2020 DXOS.org
//

import faker from 'faker';

import { GraphData } from '../graph';
import { TestGraph, LinkType, TestNode } from './types';

// https://www.npmjs.com/package/faker#setting-a-randomness-seed
export const seed = (seed: number) => faker.seed(seed);

/**
 * Convert test data to graph layout.
 * @param graph
 */
export const convertToGraphData = (graph: TestGraph): GraphData<TestNode> => {
  const nodes = graph.nodes.map(node => ({ id: node.id, data: node }));
  const links = graph.links.map(link => ({
    id: `${link.source}-${link.target}`,
    source: nodes.find(node => node.id === link.source),
    target: nodes.find(node => node.id === link.target),
  }));

  return {
    nodes,
    links
  };
};

//
// Create data.
//

export const createNode = (type: string = undefined): TestNode => ({
  id: faker.datatype.uuid(),
  type,
  label: faker.lorem.words(3).replace(/ /g, '-')
});

export const createNodes = (n = 0): TestNode[] => Array.from({ length: n }).map(createNode);

export const createLink = (source: TestNode, target: TestNode): LinkType => ({
  id: `${source.id}-${target.id}`,
  source: source.id,
  target: target.id
});

/**
 * Creates a random tree.
 * @param depth Depth of tree.
 * @param branching Branching factor.
 */
export const createTree = ({ depth = 2, chidren = 3 } = {}): TestNode => {
  const createChildren = (root: TestNode, d = 0) => {
    if (d < depth) {
      const max = Math.round(Math.log(depth + 1 - d) * chidren);
      const num = faker.datatype.number({ min: 1, max });
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
export const convertTreeToGraph = (root: TestNode) => {
  const traverse = (node: TestNode, graph: TestGraph) => {
    graph.nodes.push(node);
    node.children?.forEach(child => {
      graph.links.push(createLink(node, child));
      traverse(child, graph);
    });

    return graph;
  };

  return traverse(root, {
    nodes: [],
    links: []
  });
};

/**
 * Creates a random graph.
 * @param numNodes
 * @param numLinks
 */
export const createGraph = (numNodes = 0, numLinks = 0) => {
  const nodes = createNodes(numNodes);
  const links = new Map();

  if (numLinks && nodes.length >= 2) {
    for (let i = 0; i < numLinks; i++) {
      const source = faker.random.arrayElement(nodes);
      const target = faker.random.arrayElement(nodes);

      if (source.id !== target.id) {
        const link = createLink(source, target);
        if (!links.get(link.id)) {
          links.set(link.id, link);
        }
      }
    }
  }

  return {
    nodes,
    links: Array.from(links.values())
  };
};

/**
 * Delete nodes and related links.
 */
export const deleteNodes = (graph: TestGraph, ids: string[]) => {
  graph.nodes = graph.nodes
    .filter(({ id }) => ids.indexOf(id) === -1);

  graph.links = graph.links
    .filter(({ source, target }) => ids.indexOf(source) === -1 && ids.indexOf(target) === -1);
};
