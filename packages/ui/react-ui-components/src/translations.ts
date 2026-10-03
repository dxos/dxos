//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-components';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'query-editor.placeholder': 'Enter text to filter, or a query (e.g., "#tag")',

        'picker-select.label': 'Select',
        'picker-none.label': 'None',
        'picker-type.placeholder': 'Type',
        'picker-tag.placeholder': 'Tag',

        'progress-meter.cancel.label': 'Cancel',
        'progress-meter.dismiss.label': 'Dismiss',
      },
    },
  },
] as const satisfies Resource[];
