//
// Copyright 2025 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Sidekick } from '#types';

export const translations = [
  {
    'en-US': {
      [Sidekick.Profile.typename]: {
        'typename.label': 'Profile',
        'typename.label_zero': 'Profiles',
        'typename.label_one': 'Profile',
        'typename.label_other': 'Profiles',
        'object-name.placeholder': 'New profile',
      },
      [Sidekick.Properties.typename]: {
        'typename.label': 'Sidekick Properties',
      },
      [meta.id]: {
        'plugin.name': 'Sidekick',
        'dashboard.title': 'Sidekick Dashboard',
        'day-ahead.title': 'Day Ahead',
        'action-items.title': 'Action Items',
        'profiles.title': 'People',
        'user-profile.title': 'Your Profile',
        'permissions.title': 'Permissions',
        'auto-respond.label': 'Auto-respond',
        'create-draft.label': 'Create draft',
        'research.label': 'Research',
        'no-entry.label': 'No journal entry for today.',
        'no-profiles.label': 'No profiles yet.',
        'no-action-items.label': 'No action items.',
      },
    },
  },
] as const satisfies Resource[];
