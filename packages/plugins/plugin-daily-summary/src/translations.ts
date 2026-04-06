//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'Daily Summary',
        'settings-summary.label': 'Manage Daily Summary',
        'create-trigger.label': 'Create daily summary trigger',
        'create-trigger.description':
          'Create a timer trigger that generates an AI-powered daily summary. After creation, edit the schedule in the Automation panel.',
      },
    },
  },
] as const satisfies Resource[];
