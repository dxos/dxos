//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Debug',
        'debug.label': 'Debug',
        'generate-objects.label': 'Generate Objects',
        'space-objects.label': 'Database',
        'open-debug-panel.label': 'Show Debug',
        'logs.label': 'Logs',
        'open-logs.label': 'Show logs',

        'settings.wireframe.label': 'Show wireframes.',
        'settings.wireframe.description': 'Overlay wireframe outlines on UI components for debugging layout.',
        'settings.trace-all.label': 'Trace all requests (100% sampling).',
        'settings.trace-all.description':
          'Override the default 30% sampling rate to capture all traces. Requires page reload to take effect.',
        'settings.tracing-panel.label': 'Open tracing panel.',
        'settings.tracing-panel.description': 'Open the tracing dashboard to inspect captured spans.',
        'settings.repair.label': 'Run repair tool.',
        'settings.repair.description': 'Attempt to detect and fix inconsistencies in local data storage.',
        'settings.download-diagnostics.label': 'Download diagnostics.',
        'settings.download-diagnostics.description':
          'Export a JSON file containing client diagnostics for troubleshooting.',
        'settings.download-logs.label': 'Download log buffer.',
        'settings.download-logs.description': 'Export the in-memory log buffer as an NDJSON file.',
        'settings.uploaded.message': 'Settings uploaded.',
        'settings.uploaded.description': 'URL copied to clipboard.',
        'settings.choose-storage-adaptor.label': 'Storage adaptor (worker reload required).',
        'settings.choose-storage-adaptor.description':
          'Select the browser storage backend. Changing this requires a worker reload and may make existing data unavailable.',
        'settings.repair-success.message': 'Repair succeeded',
        'settings.repair-failed.message': 'Repair failed',

        'settings.storage-adaptor.idb.label': 'IndexedDB',
        'settings.storage-adaptor.opfs.label': 'OPFS',
        'settings.storage-adapter.changed-alert.message':
          'Warning: Swapping the storage adapter will make your data unavailable.',

        'settings.data-store.label': 'Data Store',
      },
    },
  },
] as const satisfies Resource[];
