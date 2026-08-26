//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-task';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'mark-done.label': 'Mark done',
        'mark-todo.label': 'Mark todo',
        'status-done.label': 'Done',
        'status-pending.label': 'Pending',
        'delete-task.label': 'Delete task',
      },
    },
  },
] as const satisfies Resource[];
