//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import { Timer } from 'd3-timer';
import debug from 'debug';
import faker from 'faker';
import { useEffect, useRef } from 'react';

import { Graph, Node } from './types';
import { useObjectMutator } from './useObjectMutator';

const log = debug('spore:testing');

export interface TreeNode {
  node: Node;
  children?: TreeNode[];
}

// https://www.npmjs.com/package/faker#setting-a-randomness-seed
export const seed = (seed: number) => faker.seed(seed);

export const createItem = () => ({
  id: faker.random.uuid(),
  title: faker.lorem.words(3).replace(/ /g, '-')
});

export const createItems = (n = 0) => [...new Array(n)].map(createItem);

export const createLink = (source: Node, target: Node) => ({
  id: `${source.id}_${target.id}`,
  source: source.id,
  target: target.id
});

export const createTree = ({ minDepth = 2, maxDepth = 2, maxChildren = 8 } = {}) => {
  const createChildren = (root: TreeNode, d = 0) => {
    if (d < maxDepth) {
      const num = faker.random.number({ min: Math.max(0, minDepth - d), max: (maxChildren - 1) / (d + 1) });
      root.children = [...new Array(num)].map(() => {
        return createChildren({ node: createItem() }, d + 1);
      });
    }

    return root;
  };

  return createChildren({ node: createItem() });
};

export const convertTreeToGraph = (root: TreeNode) => {
  const graph: Graph = {
    nodes: [],
    links: []
  };

  const traverse = (node: TreeNode) => {
    graph.nodes.push(node.node);
    node.children?.forEach(child => {
      graph.links.push(createLink(node.node, child.node));
      traverse(child);
    });
  };

  traverse(root);
  return graph;
};

export const createGraph = (numNodes = 0, numLinks = 0) => {
  const nodes = createItems(numNodes);

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
export const deleteNodes = (graph: Graph, ids: string[]) => {
  graph.nodes = graph.nodes
    .filter(({ id }) => ids.indexOf(id) === -1);

  graph.links = graph.links
    .filter(({ source, target }) => ids.indexOf(source) === -1 && ids.indexOf(target) === -1);
};

/**
 * Test data set generator and mutator.
 */
export const useGraphGenerator = (options: { data?: Graph } = {}) => {
  const [data, setData,, updateData] = useObjectMutator(options.data || { nodes: [], links: [] });

  const interval = useRef<Timer | null>(null);

  const generate = () => {
    const parent = data.nodes.length ? faker.random.arrayElement(data.nodes) : undefined;
    const item = createItem();

    updateData({
      nodes: {
        $push: [
          item
        ]
      },
      links: Object.assign({}, parent && {
        $push: [
          createLink(parent as Node, item)
        ]
      })
    });
  };

  const reset = (options = { count: 0 }) => {
    const { count = 0 } = options;
    setData({
      nodes: [],
      links: []
    });

    for (let i = 0; i < count; i++) {
      generate();
    }
  };

  const stop = () => {
    if (interval.current) {
      log('stopping');
      interval.current.stop();
      interval.current = null;
    }
  };

  const start = ({ delay = 250 } = {}) => {
    stop();
    log('starting');
    interval.current = d3.interval(generate, delay);
    return stop;
  };

  // Cancel on exit.
  useEffect(() => stop, []);

  return {
    data,
    reset,
    generate,
    start,
    stop
  };
};
