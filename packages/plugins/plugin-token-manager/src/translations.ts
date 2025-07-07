//
// Copyright 2025 DXOS.org
//

import { type Resource } from 'i18next';

import { TOKEN_MANAGER_PLUGIN } from './meta';

export const translations: Resource[] = [
  {
    'en-US': {
      [TOKEN_MANAGER_PLUGIN]: {
        'plugin name': 'Tokens',
        'space panel name': 'Integrations',
        'integrations verbose label': 'Manage integrations',
        'integrations description': 'You can manage all the integrations for your space with external services here.',
        'add token': 'Add Integration',
        'add custom token': 'Custom Token',
        'delete token': 'Delete Token',
        'new integration label': 'New Integration',
      },
    },
  },
] as const;

export default translations;
