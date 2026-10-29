//
// Copyright 2026 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { CanvasNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [CanvasNamespace.key]: {
        'plugin.name': 'Canvas',
        'variant.label': 'Canvas',
        'lock-drawing.label': 'Read only',
        'unlock-drawing.label': 'Edit drawing',
        'newer-format.title': 'Read only',
        'newer-format.message':
          'A newer version of the Canvas plugin saved this drawing. Update the plugin to edit it.',
      },
    },
  },
] as const satisfies Theme.Resource[];
