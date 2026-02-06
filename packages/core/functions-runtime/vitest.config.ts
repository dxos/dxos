//
// Copyright 2024 DXOS.org
//

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, defineProject } from 'vitest/config';

import { createConfig } from '../../../vitest.base.config';

const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));
const baseConfig = createConfig({ dirname, node: true });

// Override the node project to use forks pool for native module compatibility (better-sqlite3).
const projects = baseConfig.test?.projects?.map((project: any) => {
  if (project?.test?.name === 'node') {
    return defineProject({
      ...project,
      test: {
        ...project.test,
        pool: 'forks',
      },
    });
  }
  return project;
});

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    projects,
  },
});
