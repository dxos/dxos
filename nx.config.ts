//
// Copyright 2025 DXOS.org
//

import { defineNxConfig } from 'nx';

export default defineNxConfig({
  tasksRunner: {
    runner: '@nx/devkit/tasks-runners/default',
    options: {
      cacheableOperations: ['build', 'test', 'lint'],
    },
  },
});
