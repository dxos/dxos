//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    MessengerCapabilities: 'src/types/MessengerCapabilities.ts',
    MessengerError: 'src/types/MessengerError.ts',
    MessengerOperation: 'src/types/MessengerOperation.ts',
    Notifications: 'src/types/Notifications.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    materializer: 'src/materializer/index.ts',
    operations: 'src/operations/index.ts',
    translations: 'src/translations.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: { timeout: 60_000 } },
});
