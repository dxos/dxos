//
// Copyright 2025 DXOS.org
//

import { Dashboard, Deal, Signal } from '#types';

export const translations = [
  {
    'en-US': {
      [Dashboard.Dashboard.typename]: {
        'typename.label_one': 'Portfolio Dashboard',
        'typename.label_other': 'Portfolio Dashboards',
        'object-name.placeholder': 'Portfolio Dashboard',
      },
      [Deal.Deal.typename]: {
        'typename.label_one': 'Deal',
        'typename.label_other': 'Deals',
        'object-name.placeholder': 'New Deal',
      },
      [Signal.Signal.typename]: {
        'typename.label_one': 'Signal',
        'typename.label_other': 'Signals',
        'object-name.placeholder': 'New Signal',
      },
    },
  },
];
