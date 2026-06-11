//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'CRM',

        // Companion tab label (shown in the plank's companion tab bar).
        'crm-companion.label': 'CRM',

        // Setup state (no routine configured yet).
        'crm-routine.setup.description':
          'Create a CRM routine that automatically researches senders and updates contact profiles for every new message in this mailbox.',
        'crm-routine.setup.label': 'Set up CRM',
        'crm-routine.setup-pending.label': 'Setting up…',

        // Configured state.
        'crm-routine.enabled.label': 'Enable CRM routine',
        'crm-routine.instructions.label': 'Instructions',
      },
    },
  },
] as const satisfies Resource[];
