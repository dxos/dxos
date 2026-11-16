//
// Copyright 2026 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

export const translationKey = '@dxos/react-ui-rdf';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'entity-card-type.label': 'type',
        'entity-card-name.label': 'name',
        'entity-card-more.label': '+{{count}}',
        'entity-card-more.description': '{{count}} more',
        'entity-card-statements.label_one': '{{count}} statement',
        'entity-card-statements.label_other': '{{count}} statements',
        'entity-browser-filter.placeholder': 'Filter',
        'entity-browser-actions.label': 'Column actions',
        'entity-browser-close.label': 'Close column',
      },
    },
  },
] as const satisfies Theme.Resource[];
