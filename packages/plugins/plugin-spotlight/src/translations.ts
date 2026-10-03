//
// Copyright 2025 DXOS.org
//

import type * as ThemeProvider from '@dxos/react-ui/ThemeProvider';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Spotlight',
      },
    },
  },
] as const satisfies ThemeProvider.Resource[];
