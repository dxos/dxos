//
// Copyright 2023 DXOS.org
//

import { OBSERVABILITY_PLUGIN } from './meta';

export default [
  {
    'en-US': {
      [OBSERVABILITY_PLUGIN]: {
        'plugin name': 'Telemetry',
        'observability toast label': 'Privacy Notice',
        'observability toast description':
          'Composer collects usage and performance metrics to improve the product. No user data is collected.',
        'observability toast action label': 'Settings',
        'observability toast action alt': 'Open settings to learn more or to disable.',
        'observability toast close label': 'Okay',
        'observability enabled label': 'Enable telemetry',
        // TODO: Add link about telemetry privacy. Make it clearer that user data is not collected.
        'observability description':
          'When enabled, basic usage data will be sent to the DXOS team in order to improve the product. This may include performance metrics, error logs, and usage data. No personally identifiable information, other than your public key, is included with this data and no private data ever leaves your devices.',
      },
    },
  },
];
