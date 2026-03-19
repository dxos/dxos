//
// Copyright 2025 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin name': 'Filesystem',
        'open directory label': 'Open folder',
        'open directory description': 'Open a folder from your filesystem as a workspace',
        'close directory label': 'Close folder',
        'save file label': 'Save',
        'file modified indicator': 'Modified',
        'directory empty': 'This folder is empty',
        'unsupported file type': 'Unsupported file type',
      },
    },
  },
] as const satisfies Resource[];
