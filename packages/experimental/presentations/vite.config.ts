//
// Copyright 2022 DXOS.org
//

import mdx, { Options } from '@mdx-js/rollup';
import react from '@vitejs/plugin-react';
import remarkDirective from 'remark-directive';
import { codeImport } from 'remark-code-import';
import remarkFrontmatter from 'remark-frontmatter';
import remarkParseFrontmatter from 'remark-parse-frontmatter';
import remarkUnwrapTexts from 'remark-unwrap-texts';
import { defineConfig } from 'vite';

// @ts-ignore
import { remarkDirectiveLayout, remarkPluginPageLayout } from './src';

// Rollup plugin (for Vite) to process MDX.
// https://mdxjs.com/packages/rollup
const mdxOptions: Options = {
  // Remark transforms markdown.
  // https://github.com/remarkjs/remark/blob/main/doc/plugins.md#list-of-plugins
  remarkPlugins: [
    // https://github.com/remarkjs/remark-frontmatter
    [remarkFrontmatter, 'yaml'],

    // TODO(burdon): Parsing works, but how to access parsed frontmatter?
    // https://www.npmjs.com/package/remark-parse-frontmatter
    [remarkUnwrapTexts],
    [
      remarkParseFrontmatter,
      {
        properties: {
          title: { type: 'string', required: true },
          subheading: { type: 'string' },
          tags: { type: 'array', maxItems: 4 }
        }
      }
    ],

    // Custom page container using frontmatter.
    [remarkPluginPageLayout, {}],

    // Custom layout with directives:
    // https://github.com/remarkjs/remark-directive
    [remarkDirective],
    [remarkDirectiveLayout, {}],

    // https://github.com/kevin940726/remark-code-import
    [codeImport]
  ]

  // TODO(burdon): Mermaid:
  //  https://github.com/remcohaszing/remark-mermaidjs
  //  https://mermaid-js.github.io/mermaid/#/Setup

  // TODO(burdon): Simpler image syntax:
  //  https://github.com/remarkjs/remark-images

  // TODO(burdon): Github links:
  //  https://github.com/remarkjs/remark-github

  // TODO(burdon): Code sandbox:
  //  TODO(burdon): https://github.com/kevin940726/remark-codesandbox

  // Rehype transforms HTML.
  // https://github.com/rehypejs/rehype/blob/main/doc/plugins.md#list-of-plugins
  // rehypePlugins: []
};

// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    // https://mdxjs.com/packages/remark-mdx
    mdx(mdxOptions),
    react()
  ]
});
