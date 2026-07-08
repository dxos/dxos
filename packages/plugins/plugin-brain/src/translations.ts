//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Brain',
        'facts-companion.label': 'Facts',
        'facts-empty.label': 'No facts have been extracted in this space yet.',
      },
    },
  },
] as const satisfies Resource[];
