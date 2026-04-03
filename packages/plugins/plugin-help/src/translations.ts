//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin name': 'Help',
        'open help tour': 'Show welcome tour',
        'open shortcuts label': 'Show shortcuts',
        'shortcuts dialog title': 'Shortcuts',
      },
    },
  },
] as const satisfies Resource[];
