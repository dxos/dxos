//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'ns/HaloServices': 'src/HaloServices.ts',
    'index': 'src/index.ts',
    'components': 'src/components/index.ts',
    'containers': 'src/containers/index.ts',
    'ClientOperation': 'src/types/ClientOperation.ts',
    'operations': 'src/operations/index.ts',
    'testing': 'src/testing/index.ts',
    'translations': 'src/translations.ts',
    'ClientOptions': 'src/types/ClientOptions.ts',
    'Account': 'src/types/Account.ts',
    'AccountCache': 'src/types/AccountCache.ts',
    'ClientAction': 'src/types/ClientAction.ts',
    'ClientCapabilities': 'src/types/ClientCapabilities.ts',
    'ClientEvents': 'src/types/ClientEvents.ts',
    'CliLogin': 'src/types/CliLogin.ts',
    'PasskeyError': 'src/types/PasskeyError.ts',
    'types': 'src/types/index.ts',
  },
  jsx: 'react',
  test: { node: true, storybook: true },
});
