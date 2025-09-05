//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin name': 'Presenter',
        'settings title': 'Presenter settings',
        'toggle presentation label': 'Present',
        'present collections label': 'Present collections (experimental)',
      },
    },
  },
] as const satisfies Resource[];
