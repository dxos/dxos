//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';

import { Item } from '@dxos/client';
import { truncateKey } from '@dxos/debug';

/**
 * Wrapper (e.g., for Party).
 */
export class TreeRoot {
  constructor(public id: string, public readonly children: TreeNode[]) {}
}

export type TreeNode = TreeRoot | Item;

/**
 * Create tree using depth first traversal.
 * https://waylonwalker.com/drawing-ascii-boxes/#connectors
 */
export const treeLogger = (
  node: TreeNode,
  ancestors: [TreeNode, number][] = [],
  rows: string[] = []
) => {
  if (node.children?.length) {
    node.children!.forEach((child: TreeNode, i) => {
      treeLogger(child, [...ancestors, [node, i]], rows);
    });
  } else {
    const len = 10;
    const name = (node: TreeNode) =>
      chalk.blue(truncateKey(node.id, (len - 2) / 2));

    const parts = [];
    ancestors.forEach(([node, i], j) => {
      // Current is on first row.
      const first = ancestors.slice(j).every(([_, i]) => i === 0);

      // Root.
      parts.push(j === 0 ? (first ? '├' : ' ') : '');

      // Ancestor name (if first row) or padding.
      parts.push(first ? `─(${name(node)})─` : ''.padEnd(len + 4));

      // Connector to children.
      if (first) {
        parts.push(node.children.length > 1 ? '┬' : '─');
      } else {
        // Child is on first row.
        const childFirst = ancestors.slice(j + 1).every(([_, i]) => i === 0);

        // Last child.
        if (node.children.length - 1 === i) {
          parts.push(childFirst ? '╰' : ' ');
        } else {
          parts.push(childFirst ? '├' : '│');
        }
      }
    });

    parts.push(`─(${name(node)})`);
    rows.push(parts.join(''));
  }

  return rows.join('\n');
};
