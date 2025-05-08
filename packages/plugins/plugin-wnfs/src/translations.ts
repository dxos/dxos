//
// Copyright 2023 DXOS.org
//

import { WNFS_PLUGIN } from './meta';
import { FileType } from './types';

export default [
  {
    'en-US': {
      [FileType.typename]: {
        'typename label': 'File',
        'object name placeholder': 'New file',
      },
      [WNFS_PLUGIN]: {
        'plugin name': 'Files',
        'delete object label': 'Delete',
        'file input placeholder': 'Drop a file here, or click to select a file',
      },
    },
  },
];
