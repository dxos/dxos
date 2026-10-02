//
// Copyright 2026 DXOS.org
//

import type * as ThemeProvider from '@dxos/react-ui/ThemeProvider';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'CRM',
        'nav-tree-group-crm.label': 'CRM',
        'research.label': 'Research',
      },
    },
  },
] as const satisfies ThemeProvider.Resource[];
