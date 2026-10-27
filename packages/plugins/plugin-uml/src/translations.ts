//
// Copyright 2026 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { UmlNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [UmlNamespace.key]: {
        'plugin.name': 'UML',
      },
    },
  },
] as const satisfies Theme.Resource[];
