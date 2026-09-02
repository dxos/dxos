//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-task';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'task-list.label': 'Tasks',
        'mark-done.label': 'Mark done',
        'mark-todo.label': 'Mark todo',
        'status-backlog.label': 'Backlog',
        'status-todo.label': 'To Do',
        'status-blocked.label': 'Blocked',
        'status-started.label': 'Started',
        'status-review.label': 'In Review',
        'status-done.label': 'Done',
        'status-failed.label': 'Failed',
        'status-cancelled.label': 'Cancelled',
        'status-duplicate.label': 'Duplicate',
        'task-status.label': 'Status',
        'task-blocked.label': 'Blocked',
        'task-priority.label': 'Priority',
        'priority-none.label': 'None',
        'task-estimate.label': 'Estimate',
        'estimate-none.label': 'None',
        'priority-low.label': 'Low',
        'priority-medium.label': 'Medium',
        'priority-high.label': 'High',
        'priority-urgent.label': 'Urgent',
        'task-actions.label': 'Task actions',
        'task-title.placeholder': 'Untitled',
        'save-task.label': 'Save',
        'cancel-edit.label': 'Cancel',
      },
    },
  },
] as const satisfies Resource[];
