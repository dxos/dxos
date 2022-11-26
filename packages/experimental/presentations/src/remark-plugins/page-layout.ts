//
// Copyright 2022 DXOS.org
//

import { h } from 'hastscript';
import { visit } from 'unist-util-visit';

export type Options = {};

/**
 * Custom page layout using front matter.
 *
 * https://github.com/remarkjs/remark-frontmatter
 * https://github.com/unifiedjs/unified#plugin
 * https://github.com/syntax-tree/unist-util-visit
 */
export const remarkPluginPageLayout = (options: Options) => (tree: any) => {
  visit(tree, { type: 'yaml' }, (node) => {
    console.log('tree', tree);

    const data = node.data || (node.data = {});
    console.log('node', node, typeof node.value);

    data.hName = 'div';
    data.hProperties = h('div', { class: 'xxx' }).properties;
  });
};

// mdast node types: https://github.com/syntax-tree/mdast
