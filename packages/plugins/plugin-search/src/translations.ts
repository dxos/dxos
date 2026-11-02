//
// Copyright 2023 DXOS.org
//

import { translations as searchTranslations } from '@dxos/react-ui-search/translations';
import type * as Theme from '@dxos/react-ui/Theme';

import { SearchNamespace } from './namespace.ts';

export const translations = [
  ...searchTranslations,
  {
    'en-US': {
      [SearchNamespace.key]: {
        'plugin.name': 'Search',
        'search-action.label': 'Search spaces',
        'search.placeholder': 'Search…',
        'search-dialog.title': 'Search',
        'recently-closed.heading': 'Recently closed',
        'pending-results.message': 'Searching…',
        'search.label': 'Search',
        'search-result-list.label': 'Search results',
        'search-result-list.empty.label': 'No results',
        'query-action-failed.title': 'Could not complete that action',
      },
    },
  },
] as const satisfies Theme.Resource[];
