//
// Copyright 2025 DXOS.org
//

import * as Translations from '@dxos/app-toolkit/Translations';

import { SettingsNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [SettingsNamespace.key]: {
        'plugin-settings.label': 'Plugin Settings',
      },
    },
  },
] as const satisfies Translations.Resource[];
