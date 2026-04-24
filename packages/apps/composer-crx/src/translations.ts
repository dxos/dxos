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
        'clip.button': 'Clip',
        'clip.hint.description': 'Use ↑/↓ to widen the selection, Esc to cancel.',
        'settings.dev-mode.label': 'Developer Mode',
        'settings.space-mode.label': 'Space Mode',
        'settings.space-id.label': 'Space ID',
      },
    },
  },
] as const satisfies Resource[];
