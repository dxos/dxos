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
        'device-overrides.label': 'This device',
        'device-overrides.description':
          'Settings are shared across your devices. Turn one on to keep this device on its own value.',
      },
    },
  },
] as const satisfies Translations.Resource[];
