//
// Copyright 2026 DXOS.org
//

import type * as ThemeProvider from '@dxos/react-ui/ThemeProvider';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Stream Deck',
        'deck-companion.label': 'Stream Deck',
        'device-connected.label': 'Stream Deck connected',
      },
    },
  },
] as const satisfies ThemeProvider.Resource[];
