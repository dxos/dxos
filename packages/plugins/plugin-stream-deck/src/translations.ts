//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

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
] as const satisfies Resource[];
