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

import 'highlight.js/styles/github.css';

import { theme } from './theme';

export type SlideProps = {
  content?: string;
  classes?: { [selector: string]: string };
};

export const Slide = ({ content = '', classes = theme.nodes }: SlideProps) => {
  // TODO(thure): `rehype-highlight` ends up using `github.css` from `highlight.js`, but this does not appear to be
  //  configurable. Find a way to remove the literal stylesheet here.
  return (
    <>
      <style>{`
.dark pre code.hljs {
  display: block;
  overflow-x: auto;
  padding: 1em
}
.dark code.hljs {
  padding: 3px 5px
}
/*!
  Theme: GitHub Dark
  Description: Dark theme as seen on github.com
  Author: github.com
  Maintainer: @Hirse
  Updated: 2021-05-15

  Outdated base version: https://github.com/primer/github-syntax-dark
  Current colors taken from GitHub's CSS
*/
.dark .hljs {
  color: #c9d1d9;
  background: #0d1117
}
.dark .hljs-doctag,
.dark .hljs-keyword,
.dark .hljs-meta .hljs-keyword,
.dark .hljs-template-tag,
.dark .hljs-template-variable,
.dark .hljs-type,
.dark .hljs-variable.language_ {
  /* prettylights-syntax-keyword */
  color: #ff7b72
}
.dark .hljs-title,
.dark .hljs-title.class_,
.dark .hljs-title.class_.inherited__,
.dark .hljs-title.function_ {
  /* prettylights-syntax-entity */
  color: #d2a8ff
}
.dark .hljs-attr,
.dark .hljs-attribute,
.dark .hljs-literal,
.dark .hljs-meta,
.dark .hljs-number,
.dark .hljs-operator,
.dark .hljs-variable,
.dark .hljs-selector-attr,
.dark .hljs-selector-class,
.dark .hljs-selector-id {
  /* prettylights-syntax-constant */
  color: #79c0ff
}
.dark .hljs-regexp,
.dark .hljs-string,
.dark .hljs-meta .hljs-string {
  /* prettylights-syntax-string */
  color: #a5d6ff
}
.dark .hljs-built_in,
.dark .hljs-symbol {
  /* prettylights-syntax-variable */
  color: #ffa657
}
.dark .hljs-comment,
.dark .hljs-code,
.dark .hljs-formula {
  /* prettylights-syntax-comment */
  color: #8b949e
}
.dark .hljs-name,
.dark .hljs-quote,
.dark .hljs-selector-tag,
.dark .hljs-selector-pseudo {
  /* prettylights-syntax-entity-tag */
  color: #7ee787
}
.dark .hljs-subst {
  /* prettylights-syntax-storage-modifier-import */
  color: #c9d1d9
}
.dark .hljs-section {
  /* prettylights-syntax-markup-heading */
  color: #1f6feb;
  font-weight: bold
}
.dark .hljs-bullet {
  /* prettylights-syntax-markup-list */
  color: #f2cc60
}
.dark .hljs-emphasis {
  /* prettylights-syntax-markup-italic */
  color: #c9d1d9;
  font-style: italic
}
.dark .hljs-strong {
  /* prettylights-syntax-markup-bold */
  color: #c9d1d9;
  font-weight: bold
}
.dark .hljs-addition {
  /* prettylights-syntax-markup-inserted */
  color: #aff5b4;
  background-color: #033a16
}
.dark .hljs-deletion {
  /* prettylights-syntax-markup-deleted */
  color: #ffdcd7;
  background-color: #67060c
}
.dark .hljs-char.escape_,
.dark .hljs-link,
.dark .hljs-params,
.dark .hljs-property,
.dark .hljs-punctuation,
.dark .hljs-tag {
  /* purposely ignored */
  
}
      `}</style>
      <ReactMarkdown
        components={components}
        // Markdown to HTML.
        remarkPlugins={[[remarkFrontmatter, 'yaml'], remarkParseFrontmatter as any]}
        // HTML processing.
        rehypePlugins={[highlight, [addClasses, classes], slideLayout]}
      >
        {content}
      </ReactMarkdown>
    </>
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

const ImageWrapper = ({ node, ...props }: { node: any }) => {
  const { alt = '', src } = props as { alt: string; src: string };
  return <img alt={alt} src={src} />;
};

const components = { img: ImageWrapper };
