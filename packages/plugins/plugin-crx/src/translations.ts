//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'CRX',
        'settings.title': 'Browser extension',
      },
    },
  },
] as const satisfies Resource[];
