//
// Copyright 2023 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

export const translations = [
  {
    'en-US': {
      composer: {
        'caught-error.message': 'Something went wrong; check the console for details.',
        'INVALID_STORAGE_VERSION.title': 'Invalid storage version',
        'INVALID_STORAGE_VERSION.message':
          'The application is not compatible with the current storage version. The data must be migrated to the new protocol in order to be used with this application. The current version is {{actual}} and the expected version is {{expected}}.',
      },
    },
  },
] as const satisfies Theme.Resource[];
