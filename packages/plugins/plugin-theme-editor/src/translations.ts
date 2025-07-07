//
// Copyright 2023 DXOS.org
//

import { type Resource } from 'i18next';

import { THEME_EDITOR_PLUGIN } from './meta';

export const translations: Resource[] = [
  {
    'en-US': {
      [THEME_EDITOR_PLUGIN]: {
        'theme editor label': 'Theme editor',
      },
    },
  },
] as const satisfies Resource[];

export default translations;
