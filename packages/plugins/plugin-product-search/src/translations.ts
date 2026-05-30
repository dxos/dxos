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
        'typename.label': 'Product Search',
        'typename.label_other': 'Product Searches',
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
        'regenerate.toast.pending.title': 'Generating search template…',
        'regenerate.toast.success.title': 'Search template generated',
        'regenerate.toast.success.description_one': 'Authored {{count}} search field.',
        'regenerate.toast.success.description_other': 'Authored {{count}} search fields.',
        'regenerate.toast.empty.description': 'No search fields derived — the page may not have rendered. Check the URL and load the extension for SPA sites.',
        'regenerate.toast.error.title': 'Template generation failed',
        'regenerate.toast.error.description': 'Could not analyze the provider. See the console for details.',
        'search-fields.label': 'Search fields',
        'search-fields.message': 'Not generated yet — click Regenerate.',
        'view-all.title': 'All',
        'view-all.label': 'All results',
        'view-starred.title': 'Starred',
        'view-starred.label': 'Starred results',
        'no-results.message': 'No results.',
        'no-starred-results.message': 'No starred results.',
        'no-result-selected.message': 'No result selected.',
        'no-providers.message': 'No providers in this space.',
        'star.label': 'Star',
        'unstar.label': 'Unstar',
        'close.label': 'Close',
        'product.label': 'Product',
        'run.label': 'Run',
        'running.label': 'Running…',
      },
    },
  },
] as const satisfies Resource[];
