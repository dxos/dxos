//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'Status Bar',
        'warning.title': 'WARNING',
        'technology-preview.message': 'Composer is currently in beta.',
        'learn-more.label': 'Learn more',
        'released.message': 'This version was released {{released}}.',
        'see-release.label': 'See release on GitHub',
        'powered-by-dxos.message': 'Powered by <dxos>DXOS</dxos>',
        'discord.label': 'Discord',
        'github.label': 'GitHub',
        'feedback.label': 'Feedback',
        'help-menu.label': 'Help & resources',
        'docs.label': 'Documentation',
        'contact-us.label': 'Contact us',
        'shortcuts.label': 'Keyboard shortcuts',
        'download-apps.label': 'Download apps',
        'about.label': 'About Composer',
      },
    },
  },
] as const satisfies Resource[];
