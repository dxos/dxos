//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin name': 'Mobile layout',
        'settings title': 'Mobile layout settings',
        'workspaces heading': 'Workspaces',
        'settings heading': 'Settings',
      },
    },
  },
] as const satisfies Resource[];
