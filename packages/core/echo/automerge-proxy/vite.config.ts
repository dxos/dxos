//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'Automerge': 'src/Automerge.ts',
    'Contract': 'src/Contract.ts',
    'Draft': 'src/Draft.ts',
    'Handle': 'src/Handle.ts',
    'Host': 'src/Host.ts',
    'Op': 'src/Op.ts',
    'Repo': 'src/Repo.ts',
    'Wire': 'src/Wire.ts',
    'errors': 'src/errors.ts',
    'internal/register-node': 'src/internal/register-node.ts',
    'internal/register-none': 'src/internal/register-none.ts',

    'testing': 'src/testing/index.ts',
  },
  test: { node: true },
});
