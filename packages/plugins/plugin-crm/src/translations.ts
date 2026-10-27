//
// Copyright 2026 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { CrmNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [CrmNamespace.key]: {
        'plugin.name': 'CRM',
        'nav-tree-group-crm.label': 'CRM',
        'research.label': 'Research',
      },
    },
  },
] as const satisfies Theme.Resource[];
