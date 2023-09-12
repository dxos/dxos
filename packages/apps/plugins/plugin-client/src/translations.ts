//
// Copyright 2023 DXOS.org
//

import { CLIENT_PLUGIN } from './types';

export default [
  {
    'en-US': {
      [CLIENT_PLUGIN]: {
        'plugin name': 'Client',
        'invalid storage version title': 'Invalid storage version',
        'invalid storage version message':
          'The application is not compatible with the current storage version. The data must be migrated to the new protocol in order to be used with this application. The current version is {{actual}} and the expected version is {{expected}}.',
      },
    },
  },
];
