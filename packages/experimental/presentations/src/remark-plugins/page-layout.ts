//
// Copyright 2022 DXOS.org
//

import matter from 'gray-matter';
import { visit } from 'unist-util-visit';

export type Options = {};

/**
 * Custom page layout using front matter.
 *
 * Plugin:
 * https://github.com/unifiedjs/unified#plugin
 *
 * Modify `unist` syntax tree:
 * https://github.com/syntax-tree/unist#list-of-utilities
 * https://github.com/syntax-tree/unist-util-visit
 * https://github.com/syntax-tree/mdast
 * https://github.com/syntax-tree/hastscript
 */
export const remarkPluginPageLayout = (options: Options) => (tree: any) => {
  visit(tree, { type: 'yaml' }, (node) => {
    // TODO(burdon): Support themes.
    // TODO(burdon): Show pager based on front matter (ESM nodes?)
    // TODO(burdon): Access parsed front matter from plugin?
    const {
      data: { title }
    } = matter(`---\n${node.value}\n---`) as any;
    console.log('Slide:', title);
    // console.log(JSON.stringify(tree, undefined, 2));

    // NOTE: Assumes all content follows frontmatter node.
    const children = tree.children.splice(1, tree.children.length - 1);

    // TODO(burdon): h1 converted to div; class not present in HTML.
    //  { type: 'heading', depth: 1 ) NOT element! h() doesn't work?
    // const header = h('div', { class: 'flex' }, [h('heading', title)]);
    // const page = h('div', { class: 'flex flex-1' }, [header, ...children]);
    // tree.children.push(page);

    // https://github.com/syntax-tree/mdast-util-mdx

    const header = {
      type: 'mdxJsxFlowElement', // TODO(burdon): ???
      name: 'div',
      attributes: [
        {
          type: 'mdxJsxAttribute',
          name: 'className',
          value: 'flex p-4 bg-slate-300' // TODO(burdon): Theme.
        }
      ],
      children: [
        {
          type: 'heading',
          depth: 1,
          children: [
            {
              type: 'text',
              value: title
            }
          ]
        }
      ]
    };

    const body = {
      type: 'mdxJsxFlowElement',
      name: 'div',
      attributes: [
        {
          type: 'mdxJsxAttribute',
          name: 'className',
          value: 'flex flex-col flex-1 p-4'
        }
      ],
      children
    };

    tree.children.push({
      type: 'mdxJsxFlowElement',
      name: 'div',
      attributes: [
        {
          type: 'mdxJsxAttribute',
          name: 'className',
          value: 'flex flex-col flex-1'
        }
      ],
      children: [header, body]
    });
  });
};
