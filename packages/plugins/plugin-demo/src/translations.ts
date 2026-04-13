//
// Copyright 2026 DXOS.org
//

import { meta } from './meta';
import { Demo } from './types';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin name': 'Demo',
        'demo panel title': 'Demo Controls',
      },
      [Demo.DemoController.typename]: {
        'typename label': 'Demo Controls',
        'object name placeholder': 'Demo Controls',
      },
      [Demo.DemoEvent.typename]: {
        'typename label': 'Demo Event',
        'object name placeholder': 'Demo Event',
      },
    },
  },
];
