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
        'selection overlaps existing comment label': 'Selected cell already has a comment',
        'comment label': 'Add comment',
        'comment ranges not supported label': 'Commenting on ranges is not yet supported',
        'no cursor label': 'Select a cell to comment',
        'open comment for sheet cell': 'View comments for cell',
      },
    },
  },
] as const;
