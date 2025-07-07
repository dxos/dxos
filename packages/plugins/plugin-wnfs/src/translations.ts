//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { WNFS_PLUGIN } from './meta';
import { FileType } from './types';

export const translations: Resource[] = [
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
] as const satisfies Resource[];

export default translations;
