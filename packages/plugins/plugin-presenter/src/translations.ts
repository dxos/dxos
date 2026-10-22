//
// Copyright 2023 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Presenter',
        'toggle-presentation.label': 'Present',
        'slide-pending.label': 'Loading…',
        'add-slide.label': 'Add slide',
        'fullscreen.label': 'Fullscreen',
      },
    },
  },
] as const satisfies Theme.Resource[];
