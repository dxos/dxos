//
// Copyright 2023 DXOS.org
//

import { type Resource } from 'i18next';

export const translationKey = 'react-ui-kanban';

export const translations: Resource[] = [
  {
    'en-US': {
      [translationKey]: {
        'add card label': 'Add card',
        'add column label': 'Add column',
        'new column name label': 'New column name',
        'remove card label': 'Remove card',
        'remove empty column label': 'Remove empty column',
        'card drag handle label': 'Drag to rearrange',
        'column drag handle label': 'Drag to rearrange',
      },
    },
  },
] as const;

export default translations;
