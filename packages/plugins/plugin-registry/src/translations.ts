//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { REGISTRY_PLUGIN } from './meta';

export const translations = [
  {
    'en-US': {
      [REGISTRY_PLUGIN]: {
        'plugin name': 'Registry',
        'details label': 'Details',
        'home page label': 'Website',
        'source label': 'Source',
        'plugin registry label': 'Plugin Registry',
        'all plugins label': 'All',
        'installed plugins label': 'Enabled',
        'recommended plugins label': 'Recommended',
        'labs plugins label': 'Labs',
        'community plugins label': 'Community',
        'load by url label': 'Load by URL (soon)',
        'coming soon label': 'Coming soon!',
        'open plugin registry label': 'Open plugin registry',
        'settings label': 'Settings',
      },
    },
  },
] as const satisfies Resource[];
