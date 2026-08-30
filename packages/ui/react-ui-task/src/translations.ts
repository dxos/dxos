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
        'status-todo.label': 'To Do',
        'status-started.label': 'Started',
        'status-review.label': 'In Review',
        'status-done.label': 'Done',
        'status-failed.label': 'Failed',
        'status-cancelled.label': 'Cancelled',
        'task-blocked.label': 'Blocked',
        'task-actions.label': 'Task actions',
        'task-title.placeholder': 'Untitled',
        'save-task.label': 'Save',
        'cancel-edit.label': 'Cancel',
      },
    },
  },
] as const satisfies Resource[];
