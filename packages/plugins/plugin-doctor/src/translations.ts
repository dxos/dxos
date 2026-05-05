//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/app-toolkit';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'Doctor',
      },
    },
  },
] as const satisfies Resource[];
