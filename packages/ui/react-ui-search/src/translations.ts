//
// Copyright 2023 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

/** Namespace of this package's strings in the i18n resources. */
export const translationKey = '@dxos/react-ui-search';

/** English strings for the search list components. */
export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'search.placeholder': 'Search...',
        'empty-results.message': 'No matching objects',
      },
    },
  },
] as const satisfies Theme.Resource[];
