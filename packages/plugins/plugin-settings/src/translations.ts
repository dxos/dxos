//
// Copyright 2025 DXOS.org
//

import { type Resource } from '@dxos/app-toolkit';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'open settings label': 'Open settings',
        'app settings label': 'Settings',
      },
    },
  },
] as const satisfies Resource[];
