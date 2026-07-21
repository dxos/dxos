//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';
import { translations as searchTranslations } from '@dxos/react-ui-search/translations';

import { meta } from '#meta';

export const translations = [
  ...searchTranslations,
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Search',
        'search-action.label': 'Search spaces',
        'search.placeholder': 'Search…',
        'search-dialog.title': 'Search',
        'recently-closed.heading': 'Recently closed',
        'pending-results.message': 'Searching…',
        'search.label': 'Search',
        'search-result-list.label': 'Search results',
        'search-result-list.empty.label': 'No results',
      },
    },
  },
] as const satisfies Resource[];
