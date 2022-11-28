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
import rehypeHighlight from 'rehype-highlight';
import { defineConfig } from 'vite';
import { VitePluginFonts } from 'vite-plugin-fonts';

// @ts-ignore
import { remarkDirectiveTest, remarkPluginLayout } from './src';

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
          layout: { type: 'string' },
          tags: { type: 'array', maxItems: 4 }
        }
      }
    ],

    // Custom page container using frontmatter.
    [remarkPluginLayout, {}],

    // Custom layout with directives:
    // https://github.com/remarkjs/remark-directive
    [remarkDirective],
    [remarkDirectiveTest, {}],

    // https://github.com/kevin940726/remark-code-import
    [codeImport]
  ],

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
  rehypePlugins: [
    // https://unifiedjs.com/explore/package/rehype-highlight
    [rehypeHighlight]
  ]
};

// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    // https://mdxjs.com/packages/remark-mdx
    mdx(mdxOptions),

    // https://www.npmjs.com/package/vite-plugin-fonts
    VitePluginFonts({
      // TODO(burdon): https://fonts.google.com/specimen/DM+Sans
      google: {
        injectTo: 'head-prepend',
        // prettier-ignore
        families: [
          'Roboto',
          'Roboto Mono',
          'DM Sans',
          'DM Mono',
          'Montserrat'
        ]
      },

      custom: {
        injectTo: 'head-prepend',
        display: 'auto',
        families: [
          {
            name: 'Sharp Sans',
            src: 'node_modules/@dxos/assets/assets/fonts/sharp-sans/*.ttf'
          }
        ]
      }
    }),

    react()
  ]
});
