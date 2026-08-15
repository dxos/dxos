//
// Copyright 2025 DXOS.org
//

import * as Translations from '@dxos/app-toolkit/Translations';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin-settings.label': 'Plugin Settings',
        'settings-scope.synced.label': 'Shared across your devices',
        'settings-scope.local.label': 'Only on this device',
        'settings-scope.rejoin-dialog.title': 'Share these settings again?',
        'settings-scope.rejoin-dialog.description':
          "This device's own values will be replaced by the ones shared across your devices.",
        'settings-scope.rejoin-dialog.cancel.label': 'Cancel',
        'settings-scope.rejoin-dialog.confirm.label': 'Replace',
      },
    },
  },
] as const satisfies Translations.Resource[];
