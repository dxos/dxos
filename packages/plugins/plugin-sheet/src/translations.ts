//
// Copyright 2023 DXOS.org
//

import { SHEET_PLUGIN } from './meta';

export default [
  {
    'en-US': {
      [SHEET_PLUGIN]: {
        'plugin name': 'Sheets',
        'sheet title placeholder': 'New sheet',
        'create sheet label': 'Create sheet',
        'create sheet section label': 'Create sheet',
        'cell placeholder': 'Cell value...',
        'toolbar left label': 'Align left',
        'toolbar left center': 'Align center',
        'toolbar left right': 'Align right',
        'selection overlaps existing comment label': 'Selection overlaps existing comment',
        'comment label': 'Add comment',
        'comment ranges not supported label': 'Commenting on ranges is not supported (yet)',
        'no cursor label': 'Select a cell to comment',
      },
    },
  },
] as const;
