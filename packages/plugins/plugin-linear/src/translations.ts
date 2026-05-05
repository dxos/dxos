//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

// plugin-linear doesn't define its own ECHO types (it materializes Task
// objects from @dxos/types). Only the plugin-level name needs translation.
export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'Linear',
      },
    },
  },
] as const satisfies Resource[];
