//
// Copyright 2024 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createConfig } from '../../../vitest.base.config';

export default createConfig({
  dirname: typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url)),
  // jsdom environment required for useKanbanBoardModel (renderHook). ReactSurface is
  // intentionally excluded from tests (atlaskit CJS issue in Node).
  node: { environment: 'jsdom' },
  browser: 'chromium',
  storybook: true,
});
