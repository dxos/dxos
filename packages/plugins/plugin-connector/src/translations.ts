//
// Copyright 2025 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

import { Connection, SyncBinding } from './types';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Connection',
        'space-panel.name': 'Connections',
        'connections-verbose.label': 'Manage connections',
        'connections.description': 'Connections to external services for this space.',
        'connections.label': 'Connections',
        'add-token.menu': 'Add Connection',
        'add-custom-token.menu': 'Custom Token',
        'delete-token.menu': 'Delete Token',
        'add-connection.label': 'Add connection',
        'delete-connection.label': 'Delete connection',
        'delete-connection.description': 'Remove this connection and its sync bindings.',
        'new-connection.label': 'New Connection',
        'new-connection.description': 'Create a new custom access token.',
        'connect.label': 'Connect',
        'connect-connection.label': 'Connect {{connector}}',
        'connect-service.description': 'Link an external service to this space.',
        'get-sync-targets-error.title': 'Failed to load sync targets',
        'close.label': 'Close',
        'sync-connection.label': 'Sync now',
        'no-connector.message': 'No service plugin is registered for this connection.',
        'sync-now.label': 'Sync now',
        'sync-now.description': 'Reconcile cards with the remote service.',
        'syncing.label': 'Syncing…',
        'change-targets.label': 'Change sync targets',
        'change-targets.description': 'Pick which remote items this connection syncs into the space.',
        'loading.label': 'Loading…',
        'targets.label': 'Sync targets',
        'no-targets.message': 'No targets selected. Click "Change sync targets" to choose.',
        'no-targets-yet.message': 'No targets yet - finish OAuth to set up the default target.',
        'sync-target.label': 'Sync target',
        'last-sync.label': 'Last synced',
        'never-synced.label': 'Never synced',
        'binding-target-missing.message': 'Synced object was deleted. Remove this binding to clean it up.',
        'remove-binding.label': 'Remove binding',
        'remove-binding.description': 'Delete this binding to stop tracking the removed object.',
        'sync-targets-dialog.title': 'Choose sync targets',
        'sync-targets-dialog.description': 'Pick which remote targets should be synced into this connection.',
        'select-all.label': 'Select all',
        'select-none.label': 'Select none',
        'no-available-targets.message': 'No remote targets available.',
        'custom-token-dialog.title': 'Add custom token',
        'custom-token-dialog.description': 'Enter a static access token. No OAuth or sync runs for custom tokens.',
        'provider-form-dialog.title': 'Connect {{label}}',
        'provider-form-dialog.no-form.message': 'Connector has no credential form configured.',
      },
      [Type.getTypename(Connection.Connection)]: {
        'typename.label': 'Connection',
        'typename.label_zero': 'Connections',
        'typename.label_one': 'Connection',
        'typename.label_other': 'Connections',
        'object-name.placeholder': 'New connection',
        'add-object.label': 'Add connection',
        'rename-object.label': 'Rename connection',
        'delete-object.label': 'Delete connection',
        'object-deleted.label': 'Connection deleted',
      },
      [Type.getTypename(SyncBinding.SyncBinding)]: {
        'typename.label': 'Sync binding',
        'typename.label_zero': 'Sync bindings',
        'typename.label_one': 'Sync binding',
        'typename.label_other': 'Sync bindings',
        'object-name.placeholder': 'Sync binding',
        'object-deleted.label': 'Sync binding deleted',
      },
    },
  },
] as const satisfies Resource[];
