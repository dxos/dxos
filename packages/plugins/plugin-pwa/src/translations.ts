//
// Copyright 2022 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'need-refresh.label': 'Refresh now to get app updates',
        'need-refresh.description': 'You’ll need these updates to continue without interruption.',
        'refresh.label': 'Refresh',
        'refresh.alt': 'Click your browser’s refresh button or use the refresh keyboard shortcut.',
        // TODO(wittjosiah): Non-react translation utils.
        // 'offline ready label': '{{appName}} is ready to use offline.',
        'offline-ready.label': 'Ready to use offline.',
        'confirm.label': 'Okay',
        'settings.updates.label': 'Updates',
        'settings.updates.check.label': 'Check for updates',
        'settings.updates.checking.label': 'Checking…',
        'settings.updates.update-now.label': 'Update now',
        'settings.updates.downloading.label': 'Downloading…',
        // Reload rather than restart: the web applies an update by reloading every open tab.
        'settings.updates.relaunch.label': 'Reload to update',
        'settings.updates.idle.message': 'Check now for a newer version of Composer.',
        'settings.updates.checking.message': 'Checking for updates…',
        'settings.updates.up-to-date.message': 'You are running the latest version of Composer. Checked {{checkedAt}}.',
        'settings.updates.available.message': 'Version {{version}} is available.',
        'settings.updates.downloading.message': 'Downloading… {{percent}}%',
        'settings.updates.ready.message': 'Update ready. Reload Composer to apply.',
        'settings.updates.failed.message': 'Update failed: {{error}}',
        'settings.updates.unsupported.message': 'Updates are not available in this browser or build.',
        'settings.updates.dev.message': 'Updates are not enabled in dev mode.',
        'settings.notifications.label': 'Notifications on this device',
        'settings.notifications.description':
          'Show a system notification for invitations and messages, even while Composer is closed.',
        'settings.notifications.unsupported.message':
          'This browser or deployment cannot show notifications while Composer is closed.',
        'settings.notifications.denied.message':
          'Notifications are blocked for Composer. Allow them in your browser settings, then turn this on again.',
        'settings.notifications.failed.message': 'Notifications could not be turned on. Try again.',
        'settings.notifications.test.title': 'Test notification',
        'settings.notifications.test.label': 'Send test',
        'settings.notifications.test.idle.message': 'Send one to see what a notification looks like on this device.',
        'settings.notifications.test.sending.message': 'Sending a test notification…',
        'settings.notifications.test.shown.message': 'The test notification reached this device.',
        'settings.notifications.test.not-shown.message':
          'The test notification did not arrive. Check that your system allows notifications from this browser.',
        'settings.notifications.test.failed.message': 'The test notification could not be sent.',
      },
    },
  },
] as const satisfies Theme.Resource[];
