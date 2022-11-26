//
// Copyright 2022 DXOS.org
//

import { h } from 'hastscript';
import { visit } from 'unist-util-visit';

export type Options = {};

/**
 * Custom layout directive.
 * https://github.com/remarkjs/remark-directive#example-styled-blocks
 *
 * Uses micromark extension syntax:
 * https://github.com/micromark/micromark-extension-directive#syntax
 *
 * Unified plugins:
 * https://unifiedjs.com/learn/guide/create-a-plugin
 *
 * ```
 *  [remarkLayoutPlugin, {}],
 * ```
 */
// TODO(burdon): Only works with ":::" colons.
export const remarkDirectiveLayout = (options: Options) => (tree: any) => {
  visit(tree, (node) => {
    if (node.type === 'textDirective' || node.type === 'leafDirective' || node.type === 'containerDirective') {
      if (node.name !== 'layout') {
        return;
      }

      // TODO(burdon): Create flexbox layout (decorate children).
      const tagName = node.type === 'textDirective' ? 'span' : 'div';
      const container = h(tagName, node.attributes);

      // Mutate directive node.
      const data = node.data || (node.data = {});
      data.hName = tagName;
      data.hProperties = container.properties;
    }
  });
};

// TODO(burdon): Experiment with full bleed images, etc.
