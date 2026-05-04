//
// Copyright 2025 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

import { Integration } from './types';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'Integration',
        'space-panel.name': 'Integrations',
        'integrations-verbose.label': 'Manage integrations',
        'integrations.description': 'Integrations with external services for this space.',
        'add-token.menu': 'Add Integration',
        'add-custom-token.menu': 'Custom Token',
        'delete-token.menu': 'Delete Token',
        'delete-integration.label': 'Delete integration',
        'new-integration.label': 'New Integration',
        'new-integration.description': 'Create a new custom access token.',
        'connect-integration.label': 'Connect {{provider}}',
        'get-sync-targets-error.title': 'Failed to load sync targets',
        'close.label': 'Close',
        'sync-integration.label': 'Sync now',
        'no-provider.message': 'No service plugin is registered for this integration.',
        'sync-now.label': 'Sync now',
        'sync-now.description': 'Reconcile cards with the remote service.',
        'syncing.label': 'Syncing…',
        'change-targets.label': 'Change sync targets',
        'change-targets.description': 'Pick which remote items this integration syncs into the space.',
        'loading.label': 'Loading…',
        'targets.label': 'Sync targets',
        'no-targets.message': 'No targets selected. Click "Change sync targets" to choose.',
        'no-targets-yet.message': 'No targets yet - finish OAuth to set up the default target.',
        'pending-sync.label': 'Pending first sync…',
        'last-sync.label': 'Last synced',
        'never-synced.label': 'Never synced',
        'sync-targets-dialog.title': 'Choose sync targets',
        'sync-targets-dialog.description': 'Pick which remote targets should be synced into this integration.',
        'select-all.label': 'Select all',
        'select-none.label': 'Select none',
        'no-available-targets.message': 'No remote targets available.',
        'custom-token-dialog.title': 'Add custom token',
        'custom-token-dialog.description': 'Enter a static access token. No OAuth or sync runs for custom tokens.',
      },
      [Integration.Integration.typename]: {
        'typename.label': 'Integration',
        'typename.label_zero': 'Integrations',
        'typename.label_one': 'Integration',
        'typename.label_other': 'Integrations',
        'object-name.placeholder': 'New integration',
        'add-object.label': 'Add integration',
        'rename-object.label': 'Rename integration',
        'delete-object.label': 'Delete integration',
        'object-deleted.label': 'Integration deleted',
      },
    },
  },
] as const satisfies Resource[];
