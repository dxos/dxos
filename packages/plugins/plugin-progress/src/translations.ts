//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Progress',
        'progress-indicator.label': 'Active progress',
      },
    },
  },
] as const satisfies Resource[];
