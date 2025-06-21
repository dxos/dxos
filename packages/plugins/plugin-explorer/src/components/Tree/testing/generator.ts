//
// Copyright 2025 DXOS.org
//

import { Key } from '@dxos/echo';
import { range } from '@dxos/util';

import { Tree, type TreeNodeType } from '../types';

type NumberOrNumberArray = number | number[];

const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Create hierarchical tree.
 */
export const createTree = (spec: NumberOrNumberArray[] = [], createText?: () => string): Tree => {
  const tree = new Tree();
  tree.root.data = { text: 'root' };

  const createNodes = (parent: TreeNodeType, spec: NumberOrNumberArray = 0): TreeNodeType[] => {
    const count = Array.isArray(spec) ? random(spec[0], spec[1]) : spec;
    return range(count, (i) => ({
      id: Key.ObjectId.random(),
      children: [],
      data: {
        text: createText?.() ?? [parent.data.text, i + 1].join('.'),
      },
    }));
  };

  const createChildNodes = (parent: TreeNodeType, [count = 0, ...rest]: NumberOrNumberArray[]): TreeNodeType => {
    const nodes = createNodes(parent, count);
    nodes.forEach((n) => tree.addNode(parent, n));
    if (rest.length) {
      for (const node of nodes) {
        createChildNodes(node, rest);
      }
    }

    return parent;
  };

  createChildNodes(tree.root, spec);
  return tree;
};
