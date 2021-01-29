//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import debug from 'debug';
import faker from 'faker';
import { useEffect, useRef } from 'react';

import { useObjectMutator } from '../data';

const log = debug('spore:testing');

// https://www.npmjs.com/package/faker#setting-a-randomness-seed
export const seed = seed => faker.seed(seed);

/**
 * @param array
 * @returns {*}
 */
export const pick = array => array[faker.random.number({ min: 0, max: array.length - 1 })];

/**
 *
 * @returns {{id: string, title: string}}
 */
export const createItem = () => ({
  id: faker.random.uuid(),
  title: faker.lorem.words(3).replace(/ /g, '-')
});

/**
 *
 * @param n
 * @returns {{id: string, title: string}[]}
 */
export const createItems = (n = 0) => [...new Array(n)].map(createItem);

/**
 * @param minDepth
 * @param maxDepth
 * @param maxChildren
 */
export const createTree = ({ minDepth = 2, maxDepth = 2, maxChildren = 8 }) => {
  const createChildren = (root, d = 0) => {
    if (d < maxDepth) {
      const num = faker.random.number({
        min: Math.max(0, minDepth - d),
        max: (maxChildren - 1) / (d + 1)
      });

      root.children = [...new Array(num)].map(() => {
        return createChildren(createItem(), d + 1);
      });
    }

    return root;
  };

  return createChildren(createItem());
};

/**
 *
 * @param source
 * @param target
 * @returns {{id: string, source: *, target: *}}
 */
export const createLink = (source, target) => ({
  id: `${source.id}_${target.id}`,
  source: source.id,
  target: target.id
});

/**
 *
 * @param root
 * @returns {{nodes: [], links: []}}
 */
export const convertTreeToGraph = root => {
  const graph = {
    nodes: [],
    links: []
  };

  const traverse = node => {
    graph.nodes.push(node);
    node.children?.forEach(child => {
      graph.links.push(createLink(node, child));
      traverse(child);
    });
  };

  traverse(root);
  return graph;
};

/**
 *
 * @param numNodes
 * @param numLinks
 * @returns {{nodes: {id: string, title: string}[], links: any[]}}
 */
export const createGraph = (numNodes = 0, numLinks = 0) => {
  const nodes = createItems(numNodes);

  const links = new Map();
  if (numLinks && nodes.length >= 2) {
    for (let i = 0; i < numLinks; i++) {
      const source = pick(nodes);
      const target = pick(nodes);

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
 * @param {{ nodes, links }} graph
 * @param {string[]} ids
 */
export const deleteNodes = (graph, ids) => {
  graph.nodes = graph.nodes.filter(({ id }) => ids.indexOf(id) === -1);
  graph.links = graph.links.filter(({ source, target }) =>
    ids.indexOf(source.id) === -1 && ids.indexOf(target.id) === -1);
};

/**
 * Test data set generator and mutator.
 *
 * @param {Object} [options]
 * @return {{ data: { nodes: [] } }}
 */
// eslint-disable-next-line no-unused-vars
export const useGraphGenerator = (options = {}) => {
  const [data, setData,, updateData] = useObjectMutator(options.data || { nodes: [], links: [] });

  const interval = useRef(null);

  const generate = () => {
    const parent = data.nodes.length ? pick(data.nodes) : undefined;
    const item = createItem();

    updateData({
      nodes: {
        $push: [
          item
        ]
      },
      links: Object.assign({}, parent && {
        $push: [
          createLink(parent, item)
        ]
      })
    });
  };

  const reset = (options = {}) => {
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
