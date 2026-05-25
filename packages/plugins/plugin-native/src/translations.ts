//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'update-ready.label': 'Ready to update',
        'update-ready.description': 'A new version of Composer is available.',
        'update.label': 'Update',
        'update.alt': 'Relaunch the app to update',
        'settings.title': 'App',
        'settings.updates.label': 'Updates',
        'settings.updates.check.label': 'Check for updates',
        'settings.updates.checking.label': 'Checking…',
        'settings.updates.update-now.label': 'Update now',
        'settings.updates.downloading.label': 'Downloading…',
        'settings.updates.relaunch.label': 'Restart to install',
        'settings.updates.idle.message': 'Check now for a newer version of Composer.',
        'settings.updates.checking.message': 'Checking for updates…',
        'settings.updates.up-to-date.message': 'You are running the latest version of Composer. Checked {{checkedAt}}.',
        'settings.updates.available.message': 'Version {{version}} is available.',
        'settings.updates.downloading.message': 'Downloading… {{percent}}%',
        'settings.updates.ready.message': 'Update ready. Restart Composer to apply.',
        'settings.updates.failed.message': 'Update failed: {{error}}',
        'settings.updates.unsupported.message': 'Updates are not available on this platform.',
      },
    },
  },
] as const satisfies Resource[];
