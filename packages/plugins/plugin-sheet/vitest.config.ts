//
// Copyright 2024 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

import { createNodeProject, createStorybookProject, resolveReporterConfig } from '../../../vitest.base.config';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    ...resolveReporterConfig({ cwd: dirname }),
    projects: [
      createNodeProject(dirname, 'jsdom'),
      createStorybookProject(dirname),
    ]
  },
});
