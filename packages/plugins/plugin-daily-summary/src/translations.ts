//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin name': 'Daily Summary',
        'summary time label': 'Summary generation time',
        'summary time description': 'Time of day to generate the daily summary (24h format).',
      },
    },
  },
] as const satisfies Resource[];
