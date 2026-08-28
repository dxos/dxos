//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-assistant';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'context.label': 'Context',
        'copy.label': 'Copy',
        'just-now.label': 'just now',
        'rewind.label': 'Rewind to this prompt',
        'summary.label': 'Summary',
        'stats.label': 'Stats',
        'tool-call.label': 'Calling',
        'tool-input.label': 'Input',
        'tool-result.label': 'Result',
        'tool-error.label': 'Error',
        'tool-run.label_one': 'Ran {{count}} command',
        'tool-run.label_other': 'Ran {{count}} commands',
        'tool-failed.label_one': '{{count}} failed',
        'tool-failed.label_other': '{{count}} failed',
        'nav-first.label': 'First message',
        'nav-previous.label': 'Previous message',
        'nav-next.label': 'Next message',
        'nav-last.label': 'Last message',
        'scroll-to-bottom.label': 'Scroll to bottom',
      },
    },
  },
] as const satisfies Resource[];
