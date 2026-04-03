//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'update ready label': 'Ready to update',
        'update ready description': 'A new version of Composer is available.',
        'update label': 'Update',
        'update alt': 'Relaunch the app to update',
      },
    },
  },
] as const satisfies Resource[];
