//
// Copyright 2024 DXOS.org
//

import { defineProject, mergeConfig } from 'vitest/config';

// import configShared from '../../../../vitest.shared';

console.log(process.cwd());

export default // configShared,
defineProject({
  root: process.cwd(),
  test: {
    coverage: {
      enabled: false,
    },
    cache: false,
    include: [`src/sanity.test.ts`],
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.nx/**'],
    name: 'automerge-index',
    root: '.',
    dir: '.',
    browser: {
      enabled: true,
      name: 'chrome',
    },
  },
});
