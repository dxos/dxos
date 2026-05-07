//
// Copyright 2025 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConfig } from '../../../vitest.base.config';

export default createConfig({
  dirname: typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url)),
  // happy-dom gives `extract-article` access to DOMParser without needing
  // linkedom. Plain-Node tests (feed-fetcher) work fine under happy-dom too.
  node: { environment: 'happy-dom' },
  storybook: true,
});
