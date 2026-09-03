//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    ClientPlugin: 'src/ClientPlugin.ts',
    capabilities: 'src/capabilities/index.ts',
    components: 'src/components/index.ts',
    containers: 'src/containers/index.ts',
    meta: 'src/meta.ts',
    operations: 'src/operations/index.ts',
    plugin: 'src/plugin.ts',
    testing: 'src/testing/index.ts',
    translations: 'src/translations.ts',
    ClientOptions: 'src/types/ClientOptions.ts',
    Account: 'src/types/Account.ts',
    AccountCache: 'src/types/AccountCache.ts',
    ClientAction: 'src/types/ClientAction.ts',
    ClientCapabilities: 'src/types/ClientCapabilities.ts',
    ClientEvents: 'src/types/ClientEvents.ts',
    PasskeyError: 'src/types/PasskeyError.ts',
    types: 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
