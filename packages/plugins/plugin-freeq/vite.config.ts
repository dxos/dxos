//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'constants': 'src/constants.ts',
    'errors': 'src/errors.ts',
    'FreeqCapabilities': 'src/FreeqCapabilities.ts',
    'FreeqPlugin': 'src/FreeqPlugin.ts',
    'meta': 'src/meta.ts',
    'plugin': 'src/plugin.ts',
    'capabilities': 'src/capabilities/index.ts',
    'capabilities/channel-backend': 'src/capabilities/channel-backend.ts',
    'services/ConnectionManager': 'src/services/ConnectionManager.ts',
    'services/CredentialProvider': 'src/services/CredentialProvider.ts',
    'services/FreeqRestApi': 'src/services/FreeqRestApi.ts',
    'services': 'src/services/index.ts',
    'services/IrcConnection': 'src/services/IrcConnection.ts',
    'services/IrcProtocol': 'src/services/IrcProtocol.ts',
    'services/Transport': 'src/services/Transport.ts',
    'translations': 'src/translations.ts',
    'types': 'src/types.ts',
  },
  jsx: 'react',
  assetsAsFiles: true,
  test: { node: true },
});
