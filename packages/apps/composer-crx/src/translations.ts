//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/composer';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'composer.title': 'composer',
        'composer.description': 'DXOS.org',
        'chat.placeholder': 'Ask or search for anything...',
        'chat.clear.button': 'Clear',
        'chat.copy.button': 'Copy',
        'chat.error.label': 'An error occurred',
        'chat.offline.label': 'Agent offline',
        'clip.button': 'Clip',
        'launch-composer.button': 'Launch Composer',
        'settings.dev-mode.label': 'Developer Mode',
        'settings.space-mode.label': 'Space Mode',
        'settings.space-id.label': 'Space ID',
        'settings.composer-urls.label': 'Composer URLs',
      },
    },
  },
] as const satisfies Resource[];
