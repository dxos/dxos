//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'app menu label': 'App menu',
        'open settings label': 'Settings',
        'open commands label': 'Search commands',
        'commands dialog title': 'Commands',
        'command list input placeholder': 'Search for commands…',
        'node actions menu invoker label': 'More options',
        'tree item actions label': 'More actions',
        'empty branch message': ' ',
      },
    },
  },
] as const satisfies Resource[];
