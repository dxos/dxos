//
// Copyright 2023 DXOS.org
//

import { FILES_PLUGIN } from './meta';

export default [
  {
    'en-US': {
      [FILES_PLUGIN]: {
        'plugin name': 'Local Files',
        'missing file permissions': 'Permission required to view the currently selected file',
        'open file label': 'Open file',
        'open directory label': 'Open directory',
        're-open file label': 'Re-open file',
        're-open directory label': 'Re-open directory',
        'save label': 'Save',
        'save as label': 'Save as',
        'close file label': 'Close file',
        'close directory label': 'Close directory',
        'export label': 'Export',
        'import label': 'Import',
        'trigger export label': 'Run export to specified directory',
        'trigger import label': 'Import from a previous export',
        'save files to directory label': 'Export directory',
        'save files to directory description':
          'At this time, export is intended for backup and exit purposes only. The export action overwrites all content in the selected directory.',
        'auto export label': 'Enable auto export',
        'auto export interval label': 'Auto export interval (seconds)',
        'open local files label': 'Directly open local files (experimental)',
      },
    },
  },
];
