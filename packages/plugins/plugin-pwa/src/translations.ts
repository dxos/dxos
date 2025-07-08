//
// Copyright 2022 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { PWA_PLUGIN } from './meta';

export const translations = [
  {
    'en-US': {
      [PWA_PLUGIN]: {
        'need refresh label': 'Refresh now to get app updates',
        'need refresh description': 'You’ll need these updates to continue without interruption.',
        'refresh label': 'Refresh',
        'refresh alt': 'Click your browser’s refresh button or use the refresh keyboard shortcut.',
        // TODO(wittjosiah): Non-react translation utils.
        // 'offline ready label': '{{appName}} is ready to use offline.',
        'offline ready label': 'Ready to use offline.',
        'confirm label': 'Okay',
      },
    },
  },
] as const satisfies Resource[];
