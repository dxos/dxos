//
// Copyright 2026 DXOS.org
//

import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';

// The package's own suite without the monorepo's browser and storybook projects, which need moon.
// It is CPU-bound, so it takes a worker per core; vitest's default leaves one idle.
export default {
  root: fileURLToPath(new URL('..', import.meta.url)),
  test: { include: ['src/**/*.test.ts'], testTimeout: 600_000, maxWorkers: availableParallelism() },
};
