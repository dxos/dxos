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
        'range key alignment label': 'Align',
        'range value start label': 'left',
        'range value center label': 'center',
        'range value end label': 'right',
        'toolbar action label': '{{key}} {{value}}',
        'selection overlaps existing comment label': 'Selected cell already has a comment',
        'comment label': 'Add comment',
        'comment ranges not supported label': 'Commenting on ranges is not yet supported',
        'no cursor label': 'Select a cell to comment',
        'open comment for sheet cell': 'View comments for cell',
        'add col before label': 'Add column before',
        'add col after label': 'Add column after',
        'delete col label': 'Delete column',
        'add row before label': 'Add row before',
        'add row after label': 'Add row after',
        'delete row label': 'Delete row',
        'range list heading': 'Ranges',
        'range title': '{{position}} — {{key}}: {{value}}',
      },
    },
  },
] as const;
