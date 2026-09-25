//
// Copyright 2022 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

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
      },
    },
  },
] as const satisfies Resource[];
