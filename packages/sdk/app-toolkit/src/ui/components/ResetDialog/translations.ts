//
// Copyright 2026 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

export const NAMESPACE = 'org.dxos.app-toolkit.reset-dialog';

export const translations = [
  {
    'en-US': {
      [NAMESPACE]: {
        'show-stack.label': 'View stack trace',
        'fatal-error.title': 'System Error',
        'fatal-error.message':
          'Refresh the page to continue. If you keep seeing this error, please create a GitHub issue or ask for help on Discord.',
        'reset-dialog.label': 'Reload or reset',
        'reset-dialog.message':
          'If you are encountering issues, reloading may fix the issue. If reloading doesn’t help, consider resetting the app.',
        'copy-error.label': 'Copy this error',
        'download-logs.label': 'Download logs',
        'feedback.label': 'Feedback',
        'feedback-sent.label': 'Feedback sent',
        'update-and-reload-page.label': 'Update',
        'reload-page.label': 'Reload',
        'safe-mode.label': 'Safe mode',
        'recovery.label': 'Recovery',
        'reset-app.label': 'Reset',
        'reset-app-confirm.label': 'Confirm to WIPE ALL DATA from this device.',
      },
    },
  },
] as const satisfies Theme.Resource[];
