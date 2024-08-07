//
// Copyright 2023 DXOS.org
//

import { EXPORT_PLUGIN } from './meta';

export default [
  {
    'en-US': {
      [EXPORT_PLUGIN]: {
        'plugin name': 'Export',
        'export label': 'Export',
        'import label': 'Import',
        'trigger export label': 'Run export to specified directory',
        'trigger import label': 'Import from a previous export',
        'save files to directory label': 'Export directory',
        'save files to directory description':
          'At this time, export is intended for backup and exit purposes only. The export action overwrites all content in the selected directory.',
        'auto export label': 'Enable auto export',
        'auto export interval label': 'Auto export interval (seconds)',
      },
    },
  },
];
