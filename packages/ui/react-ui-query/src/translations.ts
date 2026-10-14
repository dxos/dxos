//
// Copyright 2026 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

export const translationKey = '@dxos/react-ui-query';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'query-editor.placeholder': 'Enter text to filter, or a query (e.g., "#tag")',

        'picker-select.label': 'Select',
        'picker-none.label': 'None',
        'picker-type.placeholder': 'Type',
        'picker-tag.placeholder': 'Tag',
      },
    },
  },
] as const satisfies Theme.Resource[];
