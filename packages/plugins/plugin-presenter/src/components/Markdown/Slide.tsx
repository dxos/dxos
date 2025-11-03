//
// Copyright 2023 DXOS.org
//

import { h } from 'hastscript';
import React from 'react';
import ReactMarkdown, { type Options as ReactMarkdownOptions } from 'react-markdown';
import rehypeAddClasses from 'rehype-add-classes';
import rehypeHighlight from 'rehype-highlight';
import remarkFrontmatter from 'remark-frontmatter';
import remarkParseFrontmatter from 'remark-parse-frontmatter';

import 'highlight.js/styles/github.css';

import styles from './styles.css?raw';
import { theme } from './theme';

export type SlideProps = {
  content?: string;
  classes?: Record<string, string>;
};

export const Slide = ({ content = '', classes = theme.nodes }: SlideProps) => (
  // TODO(thure): `rehype-highlight` ends up using `github.css` from `highlight.js`, but this does not appear to be
  //  configurable. Find a way to remove the literal stylesheet here.
  <>
    <style>{styles}</style>
    <ReactMarkdown
      components={components}
      // Markdown to HTML.
      remarkPlugins={[[remarkFrontmatter, 'yaml'], remarkParseFrontmatter as any]}
      // HTML processing.
      rehypePlugins={[[rehypeAddClasses, classes], rehypeHighlight as any, slideLayout]}
    >
      {content}
    </ReactMarkdown>
  </>
);

/**
 * Rehype plugin to format DOM based on frontmatter.
 * https://github.com/unifiedjs/unified#plugin
 * TODO(burdon): See tools/presenter: remarkPluginLayout
 *  E.g., layout image from front-matter.
 */
const slideLayout =
  (_options = {}) =>
  (tree: any, file: any) => {
    const {
      data: { frontmatter = {} },
    } = file;

    let content = tree.children;
    const { layout, image } = frontmatter;
    if (image) {
      const img = h('div', {
        class: 'flex grow shrink-0 bg-cover bg-center bg-no-repeat',
        style: {
          backgroundImage: `url(${image})`,
        },
      });

      switch (layout) {
        case 'fullscreen': {
          content = img;
          break;
        }

        case 'columns': {
          content = h('div', { class: 'flex grow grid grid-cols-2' }, [
            h('div', { class: theme.padding }, [content]),
            img,
          ]);
          break;
        }

        case 'rows': {
          content = h('div', { class: 'flex grow flex-col' }, [
            h('div', { class: theme.padding }, [content]),
            h('div', { class: ['flex grow pt-0', theme.padding] }, [img]),
          ]);
          break;
        }
      }
    } else {
      content = h('div', { class: ['flex grow flex-col', theme.padding] }, [content]);
    }

    const root = h('div', { class: ['flex flex-col grow', theme.root] }, [content]);
    tree.children = [root];
  };

const ImageWrapper = ({ node: _, ...props }: { node: any }) => {
  const { alt = '', src } = props as { alt: string; src: string };
  return <img alt={alt} src={src} />;
};

const components: ReactMarkdownOptions['components'] = {
  img: ({ node, ...props }) => <ImageWrapper node={node} {...props} />,
};
