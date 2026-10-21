//
// Copyright 2026 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConfig } from '../../vitest.base.config.ts';

/**
 * The config's own helpers (`test/`), apart from `vitest.config.ts`: its storybook project evaluates
 * `.storybook/main.ts`, which imports packages' built output the `test` task does not build.
 */
export default createConfig({
  dirname: typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url)),
  node: true,
});
