//
// Copyright 2023 DXOS.org
//

import { translations as stackTranslations } from '@dxos/react-ui-stack';

import { STACK_PLUGIN } from './meta';

export default [
  {
    'en-US': {
      [STACK_PLUGIN]: {
        'plugin name': 'Stacks',
        'settings separation label': 'Separate sections',
        'add section beforeAll dialog title': 'Add a section to the start',
        'add section afterAll dialog title': 'Add a section to the end',
        'add section before dialog title': 'Add a section',
        'add section after dialog title': 'Add a section',
        'add section input placeholder': 'Find the type of section to add',
        'upload file label': 'Add file',
        'add section label': 'Add section',
        'empty stack message': 'Drag items into the stack.',
        'remove section label': 'Delete',
        'navigate to section label': 'Navigate to item',
        'untitled section title': 'Untitled section',
        'add section before label': 'Add before',
        'add section after label': 'Add after',
        'expand label': 'Expand',
        'collapse label': 'Collapse',
        'drag handle label': 'Press space or enter to begin dragging this item.',
      },
    },
  },
  ...stackTranslations,
];
