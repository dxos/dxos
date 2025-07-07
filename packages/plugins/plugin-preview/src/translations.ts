//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { PREVIEW_PLUGIN } from './meta';

export const translations: Resource[] = [
  {
    'en-US': {
      [PREVIEW_PLUGIN]: {
        'unable to create preview message': 'No preview',
      },
    },
  },
] as const satisfies Resource[];

export default translations;
