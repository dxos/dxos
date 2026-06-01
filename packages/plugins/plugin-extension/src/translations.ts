//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'Extension',
        'settings.title': 'Browser extension',
        'test.title': 'Connection',
        'test.button.label': 'Test connection',
        'test.pending.message': 'Contacting extension…',
        'test.connected.message': 'Connected to {{name}} v{{version}}.',
      },
    },
  },
] as const satisfies Resource[];
