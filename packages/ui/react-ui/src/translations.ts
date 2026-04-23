//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'toolbar-menu.label': 'Action menu',
        'toolbar-drag-handle.label': 'Drag to rearrange',
        'toolbar-close.label': 'Close',
      },
    },
  },
] as const satisfies Resource[];
