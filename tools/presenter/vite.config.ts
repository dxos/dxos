//
// Copyright 2022 DXOS.org
//

import mdx, { Options } from '@mdx-js/rollup';
import react from '@vitejs/plugin-react';
import remarkDirective from 'remark-directive';
import { codeImport } from 'remark-code-import';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import remarkParseFrontmatter from 'remark-parse-frontmatter';
import rehypeHighlight from 'rehype-highlight';
import { defineConfig } from 'vite';
import { VitePluginFonts } from 'vite-plugin-fonts';

import { dxosPlugin } from '@dxos/vite-plugin';

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
    // [remarkUnwrapTexts],
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

    // https://github.com/remcohaszing/remark-mdx-frontmatter
    [remarkMdxFrontmatter, { name: 'meta' }],

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

const env = (value?: string) => (value ? `"${value}"` : undefined);

// https://vitejs.dev/config
export default defineConfig({
  base: '', // Ensure relative path to assets.

  build: {
    // minify: false,
    commonjsOptions: {
      include: [/packages/, /node_modules/]
    }
  },

  // TODO(burdon): Factor out with dxosPlugin?
  optimizeDeps: {
    force: true,
    include: [
      // '@dxos/async',
      '@dxos/client',
      '@dxos/client-services',
      '@dxos/keys',
      '@dxos/log',
      '@dxos/config',
      '@dxos/gem-core',
      '@dxos/gem-spore',
      // '@dxos/metagraph',
      // '@dxos/protocols',
      // '@dxos/react-appkit',
      // '@dxos/react-async',
      '@dxos/react-client'
      // '@dxos/react-ui',
      // '@dxos/react-uikit',
      // '@dxos/rpc',
      // '@dxos/network-manager',
      // '@dxos/rpc-tunnel',
      // '@dxos/sentry',
      // '@dxos/telemetry',
      // '@dxos/util'
    ]
  },

  // TODO(burdon): dxosPlugin, themePlugin (see halo-app).
  plugins: [
    dxosPlugin(),

    react(),

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
    })
  ]
});
