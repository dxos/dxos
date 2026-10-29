//
// Copyright 2023 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { NativeNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [NativeNamespace.key]: {
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
      },
    },
  },
] as const satisfies Theme.Resource[];
