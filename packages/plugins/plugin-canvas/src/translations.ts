//
// Copyright 2026 DXOS.org
//

import type * as ThemeProvider from '@dxos/react-ui/ThemeProvider';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Canvas',
        'variant.label': 'Canvas',
      },
    },
  },
] as const satisfies ThemeProvider.Resource[];
