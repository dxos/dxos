//
// Copyright 2026 DXOS.org
//

import { translations as componentsTranslations } from '@dxos/react-ui-components/translations';
import type * as Theme from '@dxos/react-ui/Theme';

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
  ...componentsTranslations,
] as const satisfies Theme.Resource[];
