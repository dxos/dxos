//
// Copyright 2023 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { TldrawNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [TldrawNamespace.key]: {
        'plugin.name': 'tldraw',
        'settings.hover-tools.label': 'Auto hide controls',
      },
    },
  },
] as const satisfies Theme.Resource[];
