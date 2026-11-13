//
// Copyright 2026 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { IrohBeaconNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [IrohBeaconNamespace.key]: {
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
] as const satisfies Theme.Resource[];
