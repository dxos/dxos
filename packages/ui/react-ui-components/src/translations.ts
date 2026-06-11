//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-components';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'no-commits.message': 'No events yet',

        'query-editor.placeholder': 'Enter query (e.g., "#tag", "type")',

        'actor-list.placeholder': "Type '@' to add a person, or enter an email",
        'actor-list-auto.placeholder': 'Add a person by name, or enter an email',

        'picker-select.label': 'Select',
        'picker-none.label': 'None',
        'picker-type.placeholder': 'Type',
        'picker-tag.placeholder': 'Tag',
      },
    },
  },
] as const satisfies Resource[];
