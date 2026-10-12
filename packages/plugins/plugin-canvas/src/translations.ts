//
// Copyright 2026 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Canvas',
        'variant.label': 'Canvas',
        'dock-panels.label': 'Dock panels',
        'lock-drawing.label': 'Read only',
        'unlock-drawing.label': 'Edit drawing',
        'float-panels.label': 'Float panels',
      },
    },
  },
] as const satisfies Theme.Resource[];
