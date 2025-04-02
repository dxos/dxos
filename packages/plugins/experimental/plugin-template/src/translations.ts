//
// Copyright 2023 DXOS.org
//

import { TEMPLATE_PLUGIN } from './meta';
import { TemplateType } from './types';

export default [
  {
    'en-US': {
      [TemplateType.typename]: {
        'typename label': 'Template',
        'object name placeholder': 'New template',
      },
      [TEMPLATE_PLUGIN]: {
        'plugin name': 'Template',
        'delete object label': 'Delete', // TODO(burdon): Standard for actions menu.
      },
    },
  },
];
