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
        'settings.title': 'Native',
        'settings.spotlight-shortcut.label': 'Spotlight shortcut',
        'settings.spotlight-shortcut.description':
          'Global keyboard shortcut to toggle the spotlight quick-access window. Click record and press the desired key combination.',
        'settings.spotlight-shortcut.placeholder': 'Press a key combination…',
        'settings.spotlight-shortcut.record.label': 'Record',
        'settings.spotlight-shortcut.cancel.label': 'Cancel',
      },
    },
  },
] as const satisfies Resource[];
