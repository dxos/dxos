//
// Copyright 2023 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Status Bar',
        'released.message': 'Released {{released}}',
      },
    },
  },
] as const satisfies Theme.Resource[];
