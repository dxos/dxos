//
// Copyright 2026 DXOS.org
//

import { translations as searchTranslations } from '@dxos/react-ui-search/translations';
import type * as ThemeProvider from '@dxos/react-ui/ThemeProvider';

import { meta } from '#meta';

// Search translations ride the mobile plugin: the Home/NavBranch search panels are the only
// registrar for @dxos/react-ui-search strings.
export const translations = [
  ...searchTranslations,
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Mobile',
        'actions-menu.label': 'Options',
        'main-menu.label': 'Main menu',
        'back.label': 'Back',
        'done.label': 'Done',
        'expand-drawer.label': 'Expand drawer',
        'collapse-drawer.label': 'Collapse drawer',
        'close-drawer.label': 'Close drawer',
        'empty-branch.message': 'Nothing here yet.',
        'empty-drawer.message': 'Nothing to show here.',
        'no-results.message': 'No matches.',
      },
    },
  },
] as const satisfies ThemeProvider.Resource[];
