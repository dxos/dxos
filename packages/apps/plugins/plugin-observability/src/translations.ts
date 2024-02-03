//
// Copyright 2023 DXOS.org
//

import { OBSERVABILITY_PLUGIN } from './meta';

export default [
  {
    'en-US': {
      [OBSERVABILITY_PLUGIN]: {
        'plugin name': 'Observability',
        'observability toast label': 'Telemetry Notice',
        'observability toast description':
          'Composer collects basic usage and performance metrics to improve the product. No private data is collected.',
        'observability toast action label': 'Settings',
        'observability toast action alt': 'Open settings to learn more or to disable.',
        'observability toast close label': 'Okay',
        'observability enabled label': 'Observability Enabled',
        'observability description':
          'When enabled, basic observability data will be sent to the DXOS team in order to improve the product. This includes performance metrics, error logs, and usage data. No personally identifiable information, other than your public key, is included with this data and no private data ever leaves your devices. TODO: Add link about telemetry privacy.',
      },
    },
  },
];
