//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';

import { meta } from './meta';
import { Provider, Result, Search } from './types';

export const translations = [
  ...formTranslations,
  {
    'en-US': {
      [Type.getTypename(Search.Search)]: {
        'typename.label': 'Search',
        'typename.label_other': 'Searches',
        'object-name.placeholder': 'New search',
        'add-object.label': 'Add search',
      },
      [Type.getTypename(Provider.Provider)]: {
        'typename.label': 'Provider',
        'typename.label_other': 'Providers',
        'object-name.placeholder': 'New provider',
        'add-object.label': 'Add provider',
      },
      [Type.getTypename(Result.Result)]: {
        'typename.label': 'Result',
        'typename.label_other': 'Results',
      },
      [meta.id]: {
        'plugin.name': 'Product Search',
        'run-search.label': 'Run search',
        'analyze-provider.label': 'Analyze provider',
        'empty-results.message': 'No results yet',
        'providers.label': 'Providers',
        'regenerate.label': 'Regenerate',
        'search-fields.label': 'Search fields',
        'search-fields.message': 'Not generated yet — click Regenerate.',
      },
    },
  },
] as const satisfies Resource[];
