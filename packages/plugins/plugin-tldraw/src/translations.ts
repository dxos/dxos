//
// Copyright 2023 DXOS.org
//

import type * as ThemeProvider from '@dxos/react-ui/ThemeProvider';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'tldraw',
        'settings.hover-tools.label': 'Auto hide controls',
      },
    },
  },
] as const satisfies ThemeProvider.Resource[];
