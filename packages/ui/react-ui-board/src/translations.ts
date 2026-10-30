//
// Copyright 2023 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

/** Namespace of this package's strings in the i18n resources. */
export const translationKey = '@dxos/react-ui-board';

/** English strings for the board components. */
export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'move-to-center.button': 'Center board',
        'toggle-zoom.button': 'Toggle zoom',
        'zoom-in.button': 'Zoom in',
        'zoom-out.button': 'Zoom out',
        'add-object.button': 'Add object',
        'delete-object.button': 'Remove object',
        'resize-object.button': 'Resize object',
      },
    },
  },
] as const satisfies Theme.Resource[];
