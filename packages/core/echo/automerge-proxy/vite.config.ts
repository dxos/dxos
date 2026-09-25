//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    AutomergeOps: 'src/AutomergeOps.ts',
    Contract: 'src/Contract.ts',
    Cursors: 'src/Cursors.ts',
    Draft: 'src/Draft.ts',
    Handle: 'src/Handle.ts',
    Host: 'src/Host.ts',
    Op: 'src/Op.ts',
    Repo: 'src/Repo.ts',
    Sequencing: 'src/Sequencing.ts',
    Sync: 'src/Sync.ts',
    Transform: 'src/Transform.ts',
    Wire: 'src/Wire.ts',
    errors: 'src/errors.ts',

    testing: 'src/testing/index.ts',
  },
  test: { node: true },
});
