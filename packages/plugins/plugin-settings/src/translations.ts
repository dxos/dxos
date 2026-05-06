//
// Copyright 2025 DXOS.org
//

import { type Resource } from '@dxos/app-toolkit';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin-settings.label': 'Plugin Settings',
      },
    },
  },
] as const satisfies Resource[];
