//
// Copyright 2025 DXOS.org
//

import { create, makeRef } from '@dxos/live-object';
import { range } from '@dxos/util';

import { TreeNodeType } from '../types';

/**
 * Create hierarchical tree.
 */
export const createTree = (count: number[] = [], createText?: () => string) => {
  const createNodes = (n: number = 0, label: string) =>
    range(n, (i) =>
      create(TreeNodeType, {
        children: [],
        text: createText?.() ?? `${label}.${i + 1}`,
      }),
    );

  const createChildNodes = (root: TreeNodeType, [count = 0, ...rest]: number[]) => {
    const nodes = createNodes(count, root.text);
    root.children.push(...nodes.map(makeRef));
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
