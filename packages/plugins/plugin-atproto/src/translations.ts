//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'ATProto',
        'companion.label': 'Publishing',
        'network-view.label': 'What the network sees',
        'published-field.label': 'Published',
        'mirrored-field.label': 'Mirrored',
        'private-field.label': 'Private',
        'diverged-field.label': 'Diverged',
        'mirror-unresolved.label':
          'These mirrored fields are not visible on the network — the upstream record they mirror could not be found.',
        'publish-actions.label': 'Publish actions',
        'no-connection.label': 'No atproto connection in this space.',
        'status-checking.label': 'Checking publish status…',
        'status-ready.label': 'Ready to publish',
        'status-ineligible.label': 'Not publishable',
        'status-unknown.label': 'Status unknown (offline)',
        'status-published.label': 'Published (in sync)',
        'status-out-of-date.label': 'Published (out of date)',
        'confirm-publish.message': 'This writes a public record to your PDS. Publish?',
        'confirm-publish.label': 'Confirm publish',
        'cancel.label': 'Cancel',
        'publish.label': 'Publish',
        'update.label': 'Update',
        'republish.label': 'Re-publish',
        'unpublish.label': 'Unpublish',
        'pds-section.label': 'PDS',
        'handle.placeholder': 'Handle or DID',
        'browse.label': 'Browse',
        'mapped.label': 'mapped',
        'no-collections.label': 'No collections found.',
        'no-records.label': 'No records in this collection.',
        'import.label': 'Import',
        'imported.label': 'Imported',
      },
    },
  },
] as const satisfies Resource[];
