//
// Copyright 2023 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { StatusBarNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [StatusBarNamespace.key]: {
        'plugin.name': 'Status Bar',
        'released.message': 'Released {{released}}',
      },
    },
  },
] as const satisfies Theme.Resource[];
