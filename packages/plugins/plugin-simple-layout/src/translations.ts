//
// Copyright 2025 DXOS.org
//

import { type Resource } from '@dxos/react-ui';
import { translations as searchTranslations } from '@dxos/react-ui-search';

import { meta } from './meta';

export const translations = [
  ...searchTranslations,
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'Simple layout',
        'settings.title': 'Simple layout settings',
        'workspaces.heading': 'Workspaces',
        'settings.heading': 'Settings',
        'back.label': 'Back',
        'browse.label': 'Browse',
        'notifications.label': 'Notifications',
        'profile.label': 'Profile',
        'app-menu.label': 'App menu',
        'main-menu.label': 'Main menu',
        'companions-menu.label': 'Companions',
        'error-fallback.message': 'An error occurred',
        'drawer.label': 'Drawer',
        'close-drawer.label': 'Close drawer',
        'expand-drawer.label': 'Expand drawer',
        'collapse-drawer.label': 'Collapse drawer',
        'actions-menu.label': 'Actions',
        'done.label': '',
      },
    },
  },
] as const satisfies Resource[];
