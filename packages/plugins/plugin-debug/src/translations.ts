//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'Debug',
        'settings.title': 'Debug settings',
        'open-devtools.label': 'Open DevTools',
        'devtools.label': 'DevTools',
        'devtools-overview.label': 'Stats',
        'space-objects.label': 'Database',
        'debug.label': 'Debug',
        'debug-app-graph.label': 'App Graph',

        'settings.wireframe.label': 'Show wireframes.',
        'settings.wireframe.description': 'Overlay wireframe outlines on UI components for debugging layout.',
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

        'open-debug-panel.label': 'Show Debug',
        'client.label': 'Client',
        'config.label': 'Config',
        'storage.label': 'Storage',
        'logs.label': 'Logs',
        'diagnostics.label': 'Diagnostics',
        'tracing.label': 'Tracing',
        'halo.label': 'HALO',
        'identity.label': 'Identity',
        'devices.label': 'Devices',
        'keyring.label': 'Keyring',
        'credentials.label': 'Credentials',
        'echo.label': 'ECHO',
        'spaces.label': 'Spaces',
        'space.label': 'Space',
        'feeds.label': 'Feeds',
        'objects.label': 'Objects',
        'schema.label': 'Schema',
        'automerge.label': 'Automerge',
        'queues.label': 'Queues',
        'members.label': 'Members',
        'metadata.label': 'Metadata',
        'mesh.label': 'MESH',
        'signal.label': 'Signal',
        'swarm.label': 'Swarm',
        'network.label': 'Network',
        'agent.label': 'Agent',
        'dashboard.label': 'Dashboard',
        'search.label': 'Search',
        'edge.label': 'EDGE',
        'workflows.label': 'Workflows',
        'traces.label': 'Traces',
        'testing.label': 'Testing',
      },
    },
  },
] as const satisfies Resource[];
