//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { FileType } from './types';

export const translations = [
  {
    'en-US': {
      [FileType.typename]: {
        'typename label': 'File',
        'object name placeholder': 'New file',
      },
      [meta.id]: {
        'plugin name': 'Files',
        'delete object label': 'Delete',
        'file input placeholder': 'Drop a file here, or click to select a file',
      },
    },
  },
] as const satisfies Resource[];
