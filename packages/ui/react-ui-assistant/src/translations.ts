//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-assistant';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'copy.label': 'Copy',
        'rewind.label': 'Rewind to this prompt',
        'summary.label': 'Summary',
        'stats.label': 'Stats',
        'tool-call.label': 'Calling',
        'tool-result.label': 'Result',
        'tool-error.label': 'Tool error',
        'nav-first.label': 'First message',
        'nav-previous.label': 'Previous message',
        'nav-next.label': 'Next message',
        'nav-last.label': 'Last message',
      },
    },
  },
] as const satisfies Resource[];
