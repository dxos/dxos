//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';
import { translations as componentsTranslations } from '@dxos/react-ui-components';

import { meta } from './meta';
import { Graph } from './types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Graph.Graph)]: {
        'typename label': 'Explorer',
        'typename label_zero': 'Explorers',
        'typename label_one': 'Explorer',
        'typename label_other': 'Explorers',
        'object name placeholder': 'New explorer',
        'rename object label': 'Rename explorer',
        'delete object label': 'Delete explorer',
      },
      [meta.id]: {
        'plugin name': 'Explorer',
        'object title label': 'Title',
      },
    },
  },
  ...componentsTranslations,
] as const satisfies Resource[];
