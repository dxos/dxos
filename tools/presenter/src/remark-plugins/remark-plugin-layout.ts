//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import matter from 'gray-matter';
import { u } from 'unist-builder';
import { visit, Node } from 'unist-util-visit';

// NOTE: Sync with vite.config.ts
type Meta = {
  layout?: string;
  header?: boolean;
  title?: string;
  subheading?: string;
};

type Matter = {
  data: Meta;
};

type Options = {};

/**
 * Custom page layout using front matter.
 *
 * Plugin:
 * https://github.com/unifiedjs/unified#plugin
 * https://unifiedjs.com/learn/guide/create-a-plugin
 *
 * Modify `unist` syntax tree:
 * https://github.com/syntax-tree/unist#list-of-utilities
 * https://github.com/syntax-tree/unist-util-visit
 * https://github.com/syntax-tree/mdast
 * https://github.com/syntax-tree/hastscript
 */
export const remarkPluginLayout = (options: Options) => (tree: any) => {
  visit(tree, { type: 'yaml' }, (node) => {
    // TODO(burdon): Support themes.
    // TODO(burdon): Show pager based on front matter (ESM nodes?)
    // TODO(burdon): Access parsed front matter from plugin?
    const { data: meta } = matter(`---\n${node.value}\n---`) as Matter;
    // console.log('Frontmatter:', JSON.stringify(meta));

    // NOTE: Assumes all content follows frontmatter node.
    const children = tree.children.splice(1, tree.children.length - 1);
    const body = createLayout(meta, children);
    tree.children.push(body);
  });
};

/**
 * Create DOM layout based on frontmatter.
 */
const createLayout = (meta: Meta, children: Node[]) => {
  const { layout, header, title, subheading } = meta;

  const page = (body: Node[]) => {
    const parts: Node[] = [];
    if (layout !== 'full' && header !== false && title) {
      parts.push(
        div({ className: 'flex flex-col pl-2 pr-2 pt-1 pb-1 bg-slide-header' }, [
          u('heading', { depth: 1 }, [u('text', title ?? '')]),
          u('heading', { depth: 3 }, [u('text', subheading ?? '')])
        ])
      );
    }

    parts.push(...body);

    return div(
      {
        // Frontmatter for parsing by container.
        'data-frontmatter': JSON.stringify(meta),

        className: 'flex flex-col flex-1 overflow-hidden'
      },
      parts
    );
  };

  switch (layout) {
    case 'col-2':
    case 'col-3':
    case 'col-4': {
      // NOTE: Can't generate classname due to CSS stripping.
      const gridCols = {
        'col-2': 'grid-cols-2',
        'col-3': 'grid-cols-3',
        'col-4': 'grid-cols-4'
      }[layout];

      const sections = getSections(children);
      const columns = sections.map((section) => div({ className: 'flex flex-col m-2' }, section));

      // prettier-ignore
      // https://tailwindcss.com/docs/grid-column
      return page([
        div({ className: clsx('flex', 'flex-1', 'grid', gridCols) }, columns)
      ]);
    }

    case 'full':
    default: {
      return page(children);
    }
  }
};

/**
 * Split children into sections delimitered by `<br />` elements.
 */
const getSections = (children: Node[]): Node[][] => {
  let section: Node[] = [];
  const sections: Node[][] = [section];
  for (const node of children) {
    if ((node as any).type === 'mdxJsxFlowElement' && (node as any).name === 'br') {
      section = [];
      sections.push(section);
    } else {
      section.push(node);
    }
  }

  return sections;
};

/**
 * Custom builders
 */
// TODO(burdon): Factor out.
const mdx = (type: string, tagName: string, attributes: any, children?: Node[]) => {
  return u(
    type,
    {
      name: tagName,
      attributes: Object.entries(attributes).map(([name, value]) => {
        return {
          type: 'mdxJsxAttribute',
          name,
          value
        };
      })
    },
    children ?? []
  );
};

const div = (attributes: any, children?: Node[]) => {
  return mdx('mdxJsxFlowElement', 'div', attributes, children);
};
