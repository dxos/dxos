//
// Copyright 2023 DXOS.org
//

import type * as ThemeProvider from '@dxos/react-ui/ThemeProvider';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Presenter',
        'toggle-presentation.label': 'Present',
      },
    },
  },
] as const satisfies ThemeProvider.Resource[];
