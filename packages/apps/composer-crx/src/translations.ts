//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = 'composer';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'composer.title': 'composer',
        'composer.description': 'DXOS.org',
        'chat.placeholder': 'Ask or search for anything...',
        'chat.clear.button': 'Clear',
        'settings.dev-mode.label': 'Developer Mode',
        'settings.space-mode.label': 'Space Mode',
        'settings.space-id.label': 'Space ID',
      },
    },
  },
] as const satisfies Resource[];
