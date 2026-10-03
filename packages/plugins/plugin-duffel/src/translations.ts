//
// Copyright 2026 DXOS.org
//

import type * as ThemeProvider from '@dxos/react-ui/ThemeProvider';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Duffel',
        'api-key.label': 'API key',
      },
    },
  },
] as const satisfies ThemeProvider.Resource[];
