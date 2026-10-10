//
// Copyright 2025 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Spotlight',
      },
    },
  },
] as const satisfies Theme.Resource[];
