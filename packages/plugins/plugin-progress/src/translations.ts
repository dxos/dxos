//
// Copyright 2026 DXOS.org
//

import { translations as componentsTranslations } from '@dxos/react-ui-components/translations';
import type * as ThemeProvider from '@dxos/react-ui/ThemeProvider';

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
] as const satisfies ThemeProvider.Resource[];
