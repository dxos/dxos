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
      },
    },
  },
  ...stackTranslations,
];
