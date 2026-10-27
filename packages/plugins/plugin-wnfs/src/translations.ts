//
// Copyright 2023 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { WnfsNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [WnfsNamespace.key]: {
        'plugin.name': 'WNFS',
      },
    },
  },
] as const satisfies Theme.Resource[];
