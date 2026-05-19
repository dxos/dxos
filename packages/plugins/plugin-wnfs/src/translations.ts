//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { WnfsFile } from '#types';

export const translations = [
  {
    'en-US': {
      [WnfsFile.WnfsFile.typename]: {
        'typename.label': 'WNFS File',
        'typename.label_zero': 'WNFS Files',
        'typename.label_one': 'WNFS File',
        'typename.label_other': 'WNFS Files',
        'object-name.placeholder': 'New WNFS file',
        'add-object.label': 'Add WNFS file',
        'rename-object.label': 'Rename WNFS file',
        'delete-object.label': 'Delete WNFS file',
        'object-deleted.label': 'WNFS file deleted',
      },
      [meta.id]: {
        'plugin.name': 'WNFS',
        'file-input.placeholder': 'Drop a file here, or click to select a file',
      },
    },
  },
] as const satisfies Resource[];
