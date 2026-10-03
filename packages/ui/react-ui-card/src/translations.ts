//
// Copyright 2026 DXOS.org
//

import type * as ThemeProvider from '@dxos/react-ui/ThemeProvider';

export const translationKey = '@dxos/react-ui-card';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'show-contact.label': 'Show contact',
        'create-contact.label': 'Create contact',
        'remove-attendee.label': 'Remove attendee',
      },
    },
  },
] as const satisfies ThemeProvider.Resource[];
