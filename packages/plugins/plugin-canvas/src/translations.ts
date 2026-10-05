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
      },
    },
  },
] as const satisfies Theme.Resource[];
