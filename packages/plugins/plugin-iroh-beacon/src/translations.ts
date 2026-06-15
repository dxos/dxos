//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'Iroh Beacon',
        'beacon-status.label': 'Iroh beacon status',
        'beacon-title.label': 'Iroh Beacon',
        'no-peers.label': 'No peers detected',
        'transport.label': 'Transport',
        'peers-summary.label': 'Peers (online / total)',
        'beacon-counter.label': 'Beacon',
      },
    },
  },
] as const satisfies Resource[];
