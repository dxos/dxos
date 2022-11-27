//
// Copyright 2022 DXOS.org
//

import matter from 'gray-matter';
import { u } from 'unist-builder';
import { visit, Node } from 'unist-util-visit';

// NOTE: Sync with vite.config.ts
type Meta = {
  layout?: string;
  title?: string;
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

    // NOTE: Assumes all content follows frontmatter node.
    const children = tree.children.splice(1, tree.children.length - 1);
    const body = createLayout(meta, children);
    tree.children.push(body);
  });
};

/**
 * Create DOM layout.
 */
const createLayout = (meta: Meta, children: Node[]) => {
  const { layout, title } = meta;

  const page = (body: Node) => {
    const header = div({ className: 'flex pl-2 pr-2 bg-orange-400' }, [
      u('heading', { depth: 1 }, [u('text', title ?? '')])
    ]);

    return div({ className: 'flex flex-col flex-1 overflow-hidden' }, [header, body]);
  };

  switch (layout) {
    case 'full': {
      return div({ className: 'flex flex-1 flex-col' }, children);
    }

    // TODO(burdon): n columns.
    case 'col-2': {
      const sections = getSections(children);
      const columns = sections.map((section) => div({ className: 'pad-2' }, section));
      return page(div({ className: 'flex m-2' }, [div({ className: 'grid grid-cols-2' }, columns)]));
    }

    default: {
      return page(div({ className: 'flex flex-1 flex-col m-2' }, children));
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
