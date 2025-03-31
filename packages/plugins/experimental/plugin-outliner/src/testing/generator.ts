//
// Copyright 2025 DXOS.org
//

import { create } from '@dxos/live-object';
import { range } from '@dxos/util';

import { TreeNodeType } from '../types';

type NumberOrNumberArray = number | number[];

const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Create hierarchical tree.
 */
export const createTree = (count: NumberOrNumberArray[] = [], createText?: () => string): TreeNodeType => {
  const createNodes = (r: NumberOrNumberArray = 0, label: string): TreeNodeType[] => {
    const n = Array.isArray(r) ? random(r[0], r[1]) : r;
    return range(n, (i) =>
      create(TreeNodeType, {
        children: [],
        text: createText?.() ?? `${label}.${i + 1}`,
      }),
    );
  };

  const createChildNodes = (root: TreeNodeType, [count = 0, ...rest]: NumberOrNumberArray[]): TreeNodeType => {
    const nodes = createNodes(count, root.text);
    root.children.push(...nodes);
    if (rest.length) {
      for (const node of nodes) {
        createChildNodes(node, rest);
      }
    }

    return root;
  };

  const root = create(TreeNodeType, { text: 'root', children: [] });
  return createChildNodes(root, count);
};
