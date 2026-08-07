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
      },
    },
  },
] as const satisfies Translations.Resource[];
