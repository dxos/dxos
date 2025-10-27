//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { Sheet } from './types';

export const translations = [
  {
    'en-US': {
      [Sheet.Sheet.typename]: {
        'typename label': 'Sheet',
        'typename label_zero': 'Sheets',
        'typename label_one': 'Sheet',
        'typename label_other': 'Sheets',
        'object name placeholder': 'New sheet',
        'rename object label': 'Rename sheet',
        'delete object label': 'Delete sheet',
      },
      [meta.id]: {
        'plugin name': 'Sheets',
        'cell placeholder': 'Cell value...',
        'range key alignment label': 'Align',
        'range key style label': 'Style',
        'range value start label': 'Align left',
        'range value center label': 'Align center',
        'range value end label': 'Align right',
        'range value softwrap label': 'Wrap text',
        'range value highlight label': 'Highlight',
        'toolbar action label': '{{value}}',
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
        'no ranges message': 'No ranges',
        'range title': '{{position}} — {{value}}',
        'col dropped label': 'Deleted a column',
        'row dropped label': 'Deleted a row',
      },
    },
  },
] as const satisfies Resource[];
