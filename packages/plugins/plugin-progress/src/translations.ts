//
// Copyright 2026 DXOS.org
//

import { translations as componentsTranslations } from '@dxos/react-ui-components/translations';
import type * as Theme from '@dxos/react-ui/Theme';

import { ProgressNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [ProgressNamespace.key]: {
        'plugin.name': 'Progress',
        'progress-indicator.label': 'Active progress',
      },
    },
  },
  ...componentsTranslations,
] as const satisfies Theme.Resource[];
