//
// Copyright 2020 DXOS.org
//

import faker from 'faker';

import { GraphData, GraphLink } from '../graph';
import { TestNode } from './types';

// https://www.npmjs.com/package/faker#setting-a-randomness-seed
export const seed = (seed: number) => faker.seed(seed);

//
// Create data.
//

export const createNode = (type: string = undefined): TestNode => ({
  id: faker.datatype.uuid(),
  type,
  label: faker.lorem.words(3).replace(/ /g, '-')
});

export const createNodes = (n = 0): TestNode[] => Array.from({ length: n }).map(createNode);

export const createLink = (source: TestNode, target: TestNode): GraphLink => ({
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
  const traverse = (node: TestNode, graph: GraphData<TestNode>) => {
    const { children, ...rest } = node;
    graph.nodes.push(rest);
    children?.forEach((child) => {
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
export const deleteNodes = (graph: GraphData<TestNode>, ids: string[]) => {
  graph.nodes = graph.nodes.filter(({ id }) => ids.indexOf(id) === -1);

  graph.links = graph.links.filter(({ source, target }) => ids.indexOf(source) === -1 && ids.indexOf(target) === -1);
};
