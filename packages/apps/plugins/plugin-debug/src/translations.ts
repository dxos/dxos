//
// Copyright 2023 DXOS.org
//

import { DEBUG_PLUGIN } from './meta';

export default [
  {
    'en-US': {
      [DEBUG_PLUGIN]: {
        'plugin name': 'Debug',
        'mutation count': 'Number of mutations',
        'mutation period': 'Mutation period',
        'open devtools label': 'Open DevTools',
        'devtools label': 'DevTools',
        'debug label': 'Debug',
        'settings show debug panel': 'Show Debug panel.',
        'settings show devtools panel': 'Show DevTools panel.',
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
      },
    },
  },
];
