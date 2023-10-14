//
// Copyright 2023 DXOS.org
//

import { h } from 'hastscript';
import React from 'react';
import ReactMarkdown from 'react-markdown';
import addClasses from 'rehype-add-classes';
import highlight from 'rehype-highlight';
import remarkFrontmatter from 'remark-frontmatter';
import remarkParseFrontmatter from 'remark-parse-frontmatter';

import { defaultClasses, defaultPadding, defaultSlideClasses } from './styles';

// TODO(burdon): Define content type. E.g., reference to image.

export type SlideProps = {
  content?: string;
  classes?: { [selector: string]: string };
};

export const Slide = ({ content = '', classes = defaultClasses }: SlideProps) => {
  // TODO(burdon): Reconcile highlight colors with markdown editor.
  // https://www.npmjs.com/package/react-markdown
  return (
    <ReactMarkdown
      components={components}
      // Markdown to HTML.
      remarkPlugins={[[remarkFrontmatter, 'yaml'], remarkParseFrontmatter]}
      // HTML processing.
      rehypePlugins={[highlight, [addClasses, classes], slideLayout]}
    >
      {content}
    </ReactMarkdown>
  );
};

/**
 * Rehype plugin to format DOM based on frontmatter.
 * https://github.com/unifiedjs/unified#plugin
 * TODO(burdon): See tools/presenter: remarkPluginLayout
 *  E.g., layout image from front-matter.
 */
const slideLayout =
  (options = {}) =>
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
            h('div', { class: defaultPadding }, [content]),
            img,
          ]);
          break;
        }

        case 'rows': {
          content = h('div', { class: 'flex grow flex-col' }, [
            h('div', { class: defaultPadding }, [content]),
            h('div', { class: ['flex grow pt-0', defaultPadding] }, [img]),
          ]);
          break;
        }
      }
    } else {
      content = h('div', { class: ['flex grow flex-col', defaultPadding] }, [content]);
    }

    const root = h('div', { class: ['flex flex-col grow', defaultSlideClasses] }, [content]);
    tree.children = [root];
  };

const ImageWrapper = ({ node, ...props }: { node: any }) => {
  const { alt = '', src } = props as { alt: string; src: string };
  return <img alt={alt} src={src} />;
};

const components = { img: ImageWrapper };
