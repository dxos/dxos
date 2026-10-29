//
// Copyright 2023 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'update-ready.label': 'Ready to update',
        'update-ready.description': 'A new version of Composer is available.',
        'update.label': 'Restart to update',
        'update.alt': 'Relaunch the app to update',
        'unsaved-changes.label': 'Changes not saved',
        'unsaved-changes.description':
          'Some changes have not reached disk yet and would be lost. Keep Composer open until they are saved.',
        'quit-anyway.label': 'Quit anyway',
        'quit-anyway.alt': 'Quit and lose the unsaved changes',
        'restart-anyway.label': 'Restart anyway',
        'restart-anyway.alt': 'Restart and lose the unsaved changes',
        'settings.updates.label': 'Updates',
        'settings.updates.check.label': 'Check for updates',
        'settings.updates.checking.label': 'Checking…',
        'settings.updates.update-now.label': 'Update now',
        'settings.updates.downloading.label': 'Downloading…',
        'settings.updates.relaunch.label': 'Restart to update',
        'settings.updates.idle.message': 'Check now for a newer version of Composer.',
        'settings.updates.checking.message': 'Checking for updates…',
        'settings.updates.up-to-date.message': 'You are running the latest version of Composer. Checked {{checkedAt}}.',
        'settings.updates.available.message': 'Version {{version}} is available.',
        'settings.updates.downloading.message': 'Downloading… {{percent}}%',
        'settings.updates.ready.message': 'Update ready. Restart Composer to apply.',
        'settings.updates.failed.message': 'Update failed: {{error}}',
        'settings.updates.unsupported.message': 'Updates are not available on this platform.',
        'settings.updates.dev.message': 'Updates are not enabled in dev mode.',
        'settings.notifications.label': 'Notifications',
        'settings.notifications.description':
          'Show invitations and messages as notifications while Composer runs, including when its window is closed to the menu bar.',
        'settings.notifications.unsupported.message': 'This build of Composer cannot show notifications.',
        'settings.notifications.denied.message':
          'Notifications are blocked. Allow Composer in System Settings › Notifications.',
        'settings.notifications.failed.message': 'Notifications could not be turned on. Try again.',
        'settings.notifications.test.title': 'Test notification',
        'settings.notifications.test.label': 'Send test',
        'settings.notifications.test.idle.message': 'Send one to see what a notification looks like on this computer.',
        'settings.notifications.test.sending.message': 'Showing a test notification…',
        'settings.notifications.test.sent.message':
          'Test notification sent. If none appeared, allow Composer in System Settings › Notifications.',
        'settings.notifications.test.failed.message': 'The test notification could not be shown.',
      },
    },
  },
] as const satisfies Theme.Resource[];
