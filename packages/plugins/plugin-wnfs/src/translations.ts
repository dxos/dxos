//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { WnfsFile } from './types';

export const translations = [
  {
    'en-US': {
      [WnfsFile.File.typename]: {
        'typename label': 'File',
        'object name placeholder': 'New file',
        'rename object label': 'Rename file',
        'delete object label': 'Delete file',
        'object deleted label': 'File deleted',
      },
      [meta.id]: {
        'plugin name': 'Files',
        'file input placeholder': 'Drop a file here, or click to select a file',
      },
    },
  },
] as const satisfies Resource[];
