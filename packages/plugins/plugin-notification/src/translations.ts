//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'settings.title': 'Notifications',
        'enable.label': 'Enable notifications',
        'enabled.label': 'Notifications enabled',
        'disable.label': 'Disable notifications',
        'permission-denied.label': 'Notifications are blocked. Enable them in your browser or OS settings.',
        'unsupported.label': 'Push notifications are not supported on this device.',
        'rules.title': 'What to notify me about',
        'preset.enable.label': 'Enable',
        'preset.disable.label': 'Disable',
      },
    },
  },
] as const satisfies Resource[];
