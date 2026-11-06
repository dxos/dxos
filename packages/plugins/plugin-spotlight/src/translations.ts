//
// Copyright 2025 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { SpotlightNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [SpotlightNamespace.key]: {
        'plugin.name': 'Spotlight',
      },
    },
  },
] as const satisfies Theme.Resource[];
