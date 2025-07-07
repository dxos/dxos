//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translations: Resource[] = [
  {
    'en-US': {
      composer: {
        'composer.title': 'composer',
        'composer.description': 'DXOS.org',
        'button.auth': 'Authenticate',
        'input.placeholder': 'Search...',
      },
    },
  },
] as const satisfies Resource[];

export default translations;
