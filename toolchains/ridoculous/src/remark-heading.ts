//
// Copyright 2022 DXOS.org
//

import { visit } from 'unist-util-visit';

const formatNumber = (n: number[]) => n.join('.');

export interface Options {
  heading: string
}

/**
 * Create heading numbers.
 */
// TODO(burdon): Create test.
export const remarkHeading = (options: Options) => (tree: any) => {
  const heading = RegExp('^(' + options.heading + ')$', 'i'); // Matches remark-toc.
  const numbers = [0];

  visit(tree, 'heading', (node) => {
    const depth = node.depth - 2;
    if (depth >= 0) {
      visit(node, 'text', node => {
        if (node.value.match(heading)) {
          return;
        }

        if (depth >= numbers.length) {
          numbers.push(1);
        } else {
          numbers[depth] = numbers[depth] + 1;
          numbers.splice(depth + 1);
        }

        node.value = `${formatNumber(numbers)}. ${node.value}`;
      });
    }
  });
};
