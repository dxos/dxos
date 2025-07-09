//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { SETTINGS_PLUGIN } from './actions';

export const translations = [
  {
    'en-US': {
      [SETTINGS_PLUGIN]: {
        'open settings label': 'Open settings',
        'app settings label': 'Settings',
        'custom plugins label': 'Plugins',
      },
    },
  },
] as const satisfies Resource[];
