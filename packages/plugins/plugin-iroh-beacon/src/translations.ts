//
// Copyright 2026 DXOS.org
//

import type * as ThemeProvider from '@dxos/react-ui/ThemeProvider';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
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
] as const satisfies ThemeProvider.Resource[];
