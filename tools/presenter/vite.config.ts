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

    // TODO(burdon): Parsing works, but cannot access parsed frontmatter in plugin.
    // https://www.npmjs.com/package/remark-parse-frontmatter
    [remarkUnwrapTexts],
    [
      remarkParseFrontmatter,
      {
        properties: {
          title: { type: 'string', required: false },
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

  // TODO(burdon): Additional plugins:
  //  https://github.com/remcohaszing/remark-mermaidjs
  //  https://github.com/remarkjs/remark-images
  //  https://github.com/remarkjs/remark-github
  //  https://github.com/kevin940726/remark-codesandbox

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
    // https://fonts.google.com
    VitePluginFonts({
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
        preload: false,
        injectTo: 'head-prepend',
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
