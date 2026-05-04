//
// Copyright 2024 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import PluginImportSource from '@dxos/vite-plugin-import-source';

import { createConfig } from '../../../vitest.base.config';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const config = createConfig({
  dirname,
  node: {},
  // Rewrite `@dxos/**` and `#*` imports to their source files so React context singletons
  // aren't split across dist/src module instances (Chat.Root in dist vs. `#hooks` in src).
  browser: { browsers: ['chromium'], plugins: [PluginImportSource({ include: ['@dxos/**', '#*'] })] },
  storybook: true,
});

// Alias `tiktoken/lite` to a stub because its WASM entry uses top-level await which esbuild
// cannot pre-bundle through the CJS `require` in `@anthropic-ai/tokenizer`. The stub is safe
// here since stories don't exercise tokenizer paths.
const tiktokenStub = path.resolve(dirname, 'stub.mjs');
for (const project of config.test!.projects!) {
  if (typeof project === 'object' && project !== null) {
    project.resolve ??= {};
    project.resolve.alias = { ...(project.resolve.alias as Record<string, string>), 'tiktoken/lite': tiktokenStub };
  }
}

export default config;
