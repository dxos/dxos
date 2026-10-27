//
// Copyright 2023 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { TransformerNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [TransformerNamespace.key]: {
        'plugin.name': 'Transformers',
      },
    },
  },
] as const satisfies Theme.Resource[];
