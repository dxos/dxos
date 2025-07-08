//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { THEME_EDITOR_PLUGIN } from './meta';

export const translations = [
  {
    'en-US': {
      [THEME_EDITOR_PLUGIN]: {
        'theme editor label': 'Theme editor',
      },
    },
  },
] as const satisfies Resource[];
