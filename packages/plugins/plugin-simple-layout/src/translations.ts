//
// Copyright 2025 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin name': 'Simple layout',
        'settings title': 'Simple layout settings',
        'workspaces heading': 'Workspaces',
        'settings heading': 'Settings',
        'back label': 'Back',
        'browse label': 'Browse',
        'notifications label': 'Notifications',
        'profile label': 'Profile',
        'app menu label': 'App menu',
        'main menu label': 'Main menu',
        'error fallback message': 'An error occurred',
      },
    },
  },
] as const satisfies Resource[];
