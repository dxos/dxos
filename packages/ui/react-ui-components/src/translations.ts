//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-components';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'query-editor.placeholder': 'Enter query (e.g., "#tag", "type")',

        'picker-select.label': 'Select',
        'picker-none.label': 'None',
        'picker-type.placeholder': 'Type',
        'picker-tag.placeholder': 'Tag',
      },
    },
  },
] as const satisfies Resource[];
