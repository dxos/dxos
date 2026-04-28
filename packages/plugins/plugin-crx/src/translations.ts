//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'CRX',
        'settings.title': 'Browser extension',
        'settings.enabled.label': 'Accept clips',
        'settings.enabled.description': 'When off, clips sent from the composer-crx browser extension are ignored.',
        'settings.auto-open.label': 'Open after clip',
        'settings.auto-open.description': 'Navigate to the created object when a clip is received.',
      },
    },
  },
] as const satisfies Resource[];
