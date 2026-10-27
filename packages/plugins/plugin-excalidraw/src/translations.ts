//
// Copyright 2023 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { ExcalidrawNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [ExcalidrawNamespace.key]: {
        'plugin.name': 'Excalidraw',
      },
    },
  },
] as const satisfies Theme.Resource[];
