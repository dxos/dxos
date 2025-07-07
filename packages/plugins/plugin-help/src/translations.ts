//
// Copyright 2023 DXOS.org
//

import { HELP_PLUGIN } from './meta';

export const translations = [
  {
    'en-US': {
      [HELP_PLUGIN]: {
        'plugin name': 'Help',
        'open help tour': 'Show welcome tour',
        'open shortcuts label': 'Show shortcuts',
        'shortcuts dialog title': 'Shortcuts',
      },
    },
  },
] as const;

export default translations;
