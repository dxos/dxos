//
// Copyright 2022 DXOS.org
//

import mdx, { Options } from '@mdx-js/rollup';
import react from '@vitejs/plugin-react';
import remarkDirective from 'remark-directive';
import { codeImport } from 'remark-code-import';
import remarkFrontmatter from 'remark-frontmatter';
import { defineConfig } from 'vite';

// @ts-ignore
import { remarkLayoutDirective } from './src';

// Rollup plugin (for Vite) to process MDX.
// https://mdxjs.com/packages/rollup
const mdxOptions: Options = {
  // prettier-ignore

  // Remark transforms markdown.
  // https://github.com/remarkjs/remark/blob/main/doc/plugins.md#list-of-plugins
  remarkPlugins: [
    // https://github.com/remarkjs/remark-frontmatter
    [remarkFrontmatter],

    // TODO(burdon): Custom layout with directives:
    //  https://github.com/remarkjs/remark-directive
    //  Create custom plugin to process directives.
    [remarkDirective],

    [remarkLayoutDirective, {}],

    // https://github.com/kevin940726/remark-code-import
    [codeImport]
  ],

  // TODO(burdon): Mermaid transform:
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
  rehypePlugins: []
};

// TODO(burdon): Tailwind.
//  https://tailwindcss.com/docs/guides/vite#vue

// prettier-ignore
// https://vitejs.dev/config
export default defineConfig({
  plugins: [
    mdx(mdxOptions),
    react()
  ]
});
