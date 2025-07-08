//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = 'react-ui-kanban';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'add card label': 'Add card',
        'add column label': 'Add column',
        'new column name label': 'New column name',
        'remove card label': 'Remove card',
        'remove empty column label': 'Remove empty column',
        'column drag handle label': 'Drag to rearrange',
      },
    },
  },
] as const satisfies Resource[];

export default translations;
