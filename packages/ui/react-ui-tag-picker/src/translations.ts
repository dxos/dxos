//
// Copyright 2023 DXOS.org
//

import { type Resource } from 'i18next';

export const translationKey = 'react-ui-tag-picker';

export const translations: Resource[] = [
  {
    'en-US': {
      [translationKey]: {
        'remove label': 'Remove',
      },
    },
  },
] as const satisfies Resource[];

export default translations;
