//
// Copyright 2023 DXOS.org
//

import { translations as navtreeTranslations } from '@dxos/react-ui-navtree';

import { NAVTREE_PLUGIN } from './meta';

export default [
  {
    'en-US': {
      [NAVTREE_PLUGIN]: {
        'open settings label': 'Settings',
        'open commands label': 'Search commands',
        'commands dialog title': 'Commands',
        'commandlist input placeholder': 'Search for commands…',
        'node actions menu invoker label': 'More options',
      },
    },
  },
  ...navtreeTranslations,
];
