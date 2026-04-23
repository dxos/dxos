//
// Copyright 2025 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'Tokens',
        'space-panel.name': 'Integrations',
        'integrations-verbose.label': 'Manage integrations',
        'integrations.description': 'You can manage all the integrations for your space with external services here.',
        'add-token.menu': 'Add Integration',
        'add-custom-token.menu': 'Custom Token',
        'delete-token.menu': 'Delete Token',
        'new-integration.label': 'New Integration',
        'new-integration.description': 'Create a new custom access token.',
        'connect-integration.label': 'Connect {{provider}}',
      },
    },
  },
] as const satisfies Resource[];
