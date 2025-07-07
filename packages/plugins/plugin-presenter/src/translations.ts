//
// Copyright 2023 DXOS.org
//

import { type Resource } from 'i18next';

import { PRESENTER_PLUGIN } from './meta';

export const translations: Resource[] = [
  {
    'en-US': {
      [PRESENTER_PLUGIN]: {
        'plugin name': 'Presenter',
        'toggle presentation label': 'Present',
        'present collections label': 'Present collections (experimental)',
      },
    },
  },
] as const satisfies Resource[];

export default translations;
