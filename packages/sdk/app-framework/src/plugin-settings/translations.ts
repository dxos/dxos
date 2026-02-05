//
// Copyright 2025 DXOS.org
//

import { type Resource } from '../common';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'open settings label': 'Open settings',
        'app settings label': 'Settings',
        'custom plugins label': 'Plugins',
      },
    },
  },
] as const satisfies Resource[];
