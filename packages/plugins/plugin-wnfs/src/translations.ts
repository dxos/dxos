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
      },
      [WNFS_PLUGIN]: {
        'plugin name': 'Files',
        'file title placeholder': 'New file',
        'delete object label': 'Delete',
      },
    },
  },
];
