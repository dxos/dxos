//
// Copyright 2026 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { StreamDeckNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [StreamDeckNamespace.key]: {
        'plugin.name': 'Stream Deck',
        'deck-companion.label': 'Stream Deck',
        'device-connected.label': 'Stream Deck connected',
      },
    },
  },
] as const satisfies Theme.Resource[];
