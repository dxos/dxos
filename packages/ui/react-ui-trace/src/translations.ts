//
// Copyright 2026 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

export const translationKey = '@dxos/react-ui-trace';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'no-commits.message': 'No events yet',

        'gantt-axis-time.label': 'Fit to time',
        'gantt-axis-unit.label': 'One step per event',
        'gantt-legend-stats.label': 'Show usage',
        'gantt-legend-title.label': 'Show titles',
        'gantt-chart.label': 'Timeline',

        'trace.label': 'Trace',
        'trace-processes.label': 'Processes',
        'trace-details.label': 'Details',

        'trace-filter.menu': 'Filter processes',
        'trace-clear-selection.label': 'Clear process selection',
        'trace-filter-all.label': 'Show all',
        'trace-filter-none.label': 'Hide all',
        'trace-environment-app.label': 'App',
        'trace-environment-space.label': 'Space',
        'trace-environment-conversation.label': 'Conversation',
      },
    },
  },
] as const satisfies Theme.Resource[];
