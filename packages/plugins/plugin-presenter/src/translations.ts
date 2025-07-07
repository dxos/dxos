//
// Copyright 2023 DXOS.org
//

import { PRESENTER_PLUGIN } from './meta';

export const translations = [
  {
    'en-US': {
      [PRESENTER_PLUGIN]: {
        'plugin name': 'Presenter',
        'toggle presentation label': 'Present',
        'present collections label': 'Present collections (experimental)',
      },
    },
  },
] as const;

export default translations;
