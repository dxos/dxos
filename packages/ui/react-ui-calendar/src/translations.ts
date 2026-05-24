//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-calendar';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'today.button': 'Today',
        'prev.button': 'Previous month',
        'next.button': 'Next month',
        'open.button': 'Open calendar',
        'commit.button': 'OK',
        'cancel.button': 'Cancel',
        'range.from.label': 'From',
        'range.to.label': 'To',
      },
    },
  },
] as const satisfies Resource[];
