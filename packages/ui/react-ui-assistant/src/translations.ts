//
// Copyright 2026 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

export const translationKey = '@dxos/react-ui-assistant';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'context.label': 'Context',
        'copy.label': 'Copy',
        'just-now.label': 'just now',
        'rewind.label': 'Rewind to this prompt',
        'show-less.label': 'Show less',
        'show-more.label_one': 'Show more ({{count}} line)',
        'show-more.label_other': 'Show more ({{count}} lines)',
        'summary.label': 'Summary',
        'request.answered.label': 'Answered: {{option}}',
        'request.cancelled.label': 'No longer waiting',
        'stats.label': 'Stats',
        'tool-call.label': 'Calling',
        'tool-input.label': 'Input',
        'tool-result.label': 'Result',
        'tool-error.label': 'Error',
        'tool-run.label_one': 'Ran {{count}} command',
        'tool-run.label_other': 'Ran {{count}} commands',
        'tool-run-suffix.label_one': 'Ran {{count}} command',
        'tool-run-suffix.label_other': 'Ran {{count}} commands',
        'tool-thinking.label': 'Thinking',
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
] as const satisfies Theme.Resource[];
