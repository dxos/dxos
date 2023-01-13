//
// Copyright 2022 DXOS.org
//

import { h } from 'hastscript';
import { visit } from 'unist-util-visit';

type Options = {};

/**
 * Custom directive.
 * https://github.com/remarkjs/remark-directive#example-styled-blocks
 *
 * Uses micromark extension syntax:
 * https://github.com/micromark/micromark-extension-directive#syntax
 *
 * ```
 *  [remarkLayoutPlugin, {}],
 * ```
 *
 * ```
 * ::test()
 * ```
 */
export const remarkDirectiveTest = (options: Options) => (tree: any) => {
  visit(tree, (node: any) => {
    // `::` for leaf.
    if (node.type !== 'leafDirective' || node.name !== 'test') {
      return;
    }

    // TODO(burdon): Create flexbox layout (decorate children).
    const tagName = 'div';
    const container = h(tagName, node.attributes);
    const data = node.data || (node.data = {});

    // Mutate directive node.
    data.hName = tagName;
    data.hProperties = container.properties;
  });
};
