//
// Copyright 2025 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

import { createStorybookProject, resolveReporterConfig } from '../../vitest.base.config';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// NOTE: This config is merged with the storybook vite final config.
export default defineConfig({
  test: {
    ...resolveReporterConfig({ cwd: dirname }),
    projects: [createStorybookProject(dirname)],
  },
});
