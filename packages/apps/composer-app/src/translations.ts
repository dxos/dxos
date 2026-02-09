//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translations = [
  {
    'en-US': {
      composer: {
        'show stack label': 'View stack trace',
        'fatal error title': 'The app encountered an error',
        'fatal error message':
          'Please refresh the page to continue. If you keep seeing this error, please create a GitHub issue or ask for help on Discord.',
        'reset dialog label': 'Reload or reset',
        'reset dialog message':
          'If you are encountering issues, reloading may fix the issue. If reloading doesn’t help, consider resetting the app.',
        'caught error message': 'Something went wrong; check the console for details.',
        'copy error label': 'Copy this error',
        'feedback label': 'Feedback',
        'update and reload page label': 'Update',
        'reload page label': 'Reload',
        'safe mode label': 'Safe mode',
        'reset app label': 'Reset',
        'reset app confirm label': 'Confirm to reset plugins & settings to default',
        'INVALID_STORAGE_VERSION title': 'Invalid storage version',
        'INVALID_STORAGE_VERSION message':
          'The application is not compatible with the current storage version. The data must be migrated to the new protocol in order to be used with this application. The current version is {{actual}} and the expected version is {{expected}}.',
      },
    },
  },
] as const satisfies Resource[];
