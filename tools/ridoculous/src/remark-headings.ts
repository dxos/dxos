//
// Copyright 2022 DXOS.org
//

import { u } from 'unist-builder';
import { visit } from 'unist-util-visit';

import { directiveRegex, visitDirectives } from './util.js';

const formatNumber = (n: number[]) => n.join('.') + '.';

type Node = { children: Node[] };

interface Options {
  autoNumber?: boolean;
}

/**
 * Create heading numbers.
 */
// eslint-disable-next-line
export function remarkHeadings ({ autoNumber }: Options = {}) {
  return (tree: any) => {
    const numbers = [0];
    const root: Node = u('list', { spread: false }, []);
    const stack = [root];

    // visit(tree, 'list', (node, i, parent) => {
    //   console.log('>>>', JSON.stringify(node, undefined, 2));
    // });

    visit(tree, 'heading', (node) => {
      const depth = node.depth - 2;
      if (depth >= 0) {
        let ignore = false;
        visit(node, 'html', (node) => {
          const [, directive] = node.value.trim().match(directiveRegex);
          if (directive === 'ignore') {
            ignore = true;
          }
        });
        if (ignore) {
          return;
        }

        visit(node, 'text', (node) => {
          if (depth >= numbers.length) {
            numbers.push(1);
          } else {
            numbers[depth] = numbers[depth] + 1;
            numbers.splice(depth + 1);
          }

          // Update number.
          const match = node.value.match(/(?:(\S+)\s)?\s*(.+)/);
          const [, , title] = match;
          const number = formatNumber(numbers);
          node.value = autoNumber ? `${number} ${title}` : title;

          // TODO(burdon): Check conforms to rehype (and 1.11 !== 11.1?)
          // Generate links conformant to auto GH headings.
          // https://github.com/rehypejs/rehype-autolink-headings
          const link =
            number.replace(/\D/g, '') +
            '-' +
            title
              .replace(/\s+/g, '-')
              .replace(/[^\w\s-]/g, '')
              .toLowerCase();

          // Create TOC.
          let list: any;
          if (depth < stack.length) {
            list = stack[depth];
            stack.splice(depth + 1);
          } else {
            // Create a sublist.
            list = u('list', { spread: false }, []);
            stack.push(list);

            // Add to the latest list item.
            const parentList = stack[depth - 1];
            const parentListItem = parentList.children[parentList.children.length - 1];
            parentListItem?.children.push(list); // Add after the list item's paragraph.
          }

          const listItem = u('listItem', { spread: false }, [
            u('paragraph', {}, [u('link', { url: `#${link}` }, [u('text', { value: node.value })])])
          ]);

          list.children.push(listItem);
        });
      }
    });

    // Insert TOC if directive exists.
    visitDirectives(tree, (directive, args, node, i, parent) => {
      // TODO(burdon): Get depth (get this first before building TOC).
      // <!-- @toc(depth=2) -->
      if (directive === 'toc') {
        const next = parent.children[i! + 1];
        parent.children.splice(i! + 1, next.type === 'list' ? 1 : 0, root);
      }
    });
  };
}
