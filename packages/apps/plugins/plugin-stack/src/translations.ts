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
        'create stack label': 'Create stack',
        'stack title placeholder': 'New stack',
        'delete stack label': 'Delete',
        'settings separation label': 'Separate stack sections',
        'add section beforeAll dialog title': 'Add a section to the start',
        'add section afterAll dialog title': 'Add a section to the end',
        'add section before dialog title': 'Add a section',
        'add section after dialog title': 'Add a section',
        'add section input placeholder': 'Find the type of section to add',
        'upload file label': 'Add file',
        'add section label': 'Add section',
      },
    },
  },
  ...stackTranslations,
];
