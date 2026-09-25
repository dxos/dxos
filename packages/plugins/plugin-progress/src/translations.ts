//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';
import { translations as componentsTranslations } from '@dxos/react-ui-components/translations';

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
] as const satisfies Resource[];
