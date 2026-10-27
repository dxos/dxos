//
// Copyright 2026 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { BrainNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [BrainNamespace.key]: {
        'plugin.name': 'Brain',
      },
    },
  },
] as const satisfies Theme.Resource[];
