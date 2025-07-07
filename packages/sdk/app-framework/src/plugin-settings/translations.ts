//
// Copyright 2023 DXOS.org
//

import { type Resource } from 'i18next';

import { SETTINGS_PLUGIN } from './actions';

export const translations: Resource[] = [
  {
    'en-US': {
      [SETTINGS_PLUGIN]: {
        'open settings label': 'Open settings',
        'app settings label': 'Settings',
        'custom plugins label': 'Plugins',
      },
    },
  },
] as const;

export default translations;
