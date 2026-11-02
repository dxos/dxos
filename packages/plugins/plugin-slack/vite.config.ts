//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    SlackChannel: 'src/types/SlackChannel.ts',
    SlackEvents: 'src/types/SlackEvents.ts',
    SlackOperation: 'src/types/SlackOperation.ts',
    types: 'src/types/index.ts',
  },
  test: { node: true },
});
