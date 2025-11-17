//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin name': 'Debug',
        'settings title': 'Debug settings',
        'mutation count': 'Number of mutations',
        'mutation period': 'Mutation period',
        'open devtools label': 'Open DevTools',
        'devtools label': 'DevTools',
        'devtools overview label': 'Stats',
        'debug label': 'Debug',
        'debug app graph label': 'App Graph',
        'settings show debug panel': 'Show Debug panel.',
        'settings show devtools panel': 'Show DevTools panel.',
        'settings wireframe': 'Show wireframes.',
        'settings repair': 'Run repair tool.',
        'settings download diagnostics': 'Download diagnostics.',
        'settings uploaded': 'Uploaded to IPFS',
        'settings uploaded to clipboard': 'URL copied to clipboard.',
        'settings repair success': 'Repair succeeded',
        'settings repair failed': 'Repair failed',
        'settings choose storage adaptor': 'Storage adaptor (worker reload required).',
        'settings storage adaptor idb label': 'IndexedDB',
        'settings storage adaptor opfs label': 'OPFS',
        'settings data store label': 'Data Store',
        'settings storage adapter changed alert':
          'Warning: Swapping the storage adapter will make your data unavailable.',
        'settings space fragmentation': 'Enable AM space fragmentation',
        'open debug panel label': 'Show Debug',
        'client label': 'Client',
        'config label': 'Config',
        'storage label': 'Storage',
        'logs label': 'Logs',
        'diagnostics label': 'Diagnostics',
        'tracing label': 'Tracing',
        'halo label': 'HALO',
        'identity label': 'Identity',
        'devices label': 'Devices',
        'keyring label': 'Keyring',
        'credentials label': 'Credentials',
        'echo label': 'ECHO',
        'spaces label': 'Spaces',
        'space label': 'Space',
        'feeds label': 'Feeds',
        'objects label': 'Objects',
        'schema label': 'Schema',
        'automerge label': 'Automerge',
        'queues label': 'Queues',
        'members label': 'Members',
        'metadata label': 'Metadata',
        'mesh label': 'MESH',
        'signal label': 'Signal',
        'swarm label': 'Swarm',
        'network label': 'Network',
        'agent label': 'Agent',
        'dashboard label': 'Dashboard',
        'search label': 'Search',
        'edge label': 'EDGE',
        'workflows label': 'Workflows',
        'traces label': 'Traces',
        'testing label': 'Testing',
      },
    },
  },
] as const satisfies Resource[];
