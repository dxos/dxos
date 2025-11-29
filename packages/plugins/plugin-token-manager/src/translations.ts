//
// Copyright 2025 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin name': 'Tokens',
        'space panel name': 'Integrations',
        'integrations verbose label': 'Manage integrations',
        'integrations description': 'You can manage all the integrations for your space with external services here.',
        'add token': 'Add Integration',
        'add custom token': 'Custom Token',
        'delete token': 'Delete Token',
        'new integration label': 'New Integration',
        'login hint label': 'Username',
        'login hint placeholder': 'Enter your username',
      },
    },
  },
] as const satisfies Resource[];
