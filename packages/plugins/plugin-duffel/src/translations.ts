//
// Copyright 2026 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { DuffelNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [DuffelNamespace.key]: {
        'plugin.name': 'Duffel',
        'api-key.label': 'API key',
      },
    },
  },
] as const satisfies Theme.Resource[];
