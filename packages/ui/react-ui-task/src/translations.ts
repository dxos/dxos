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
        'task-properties.label': 'Properties',
        'set-priority.label': 'Set priority',
        'set-estimate.label': 'Set estimate',
        'set-assignee.label': 'Set assignee',
        'assignee-none.label': 'Unassigned',
        'assignee-agent.label': 'Agent',
        'estimate-none.label': 'None',
        'priority-low.label': 'Low',
        'priority-medium.label': 'Medium',
        'priority-high.label': 'High',
        'priority-urgent.label': 'Urgent',
        'task-actions.label': 'Task actions',
        'task-check.label': 'Select task',
        'task-title.placeholder': 'Untitled',
        'add-task.placeholder': 'Add task',
        'task-description.placeholder': 'Add a description',
        'save-task.label': 'Save',
        'task-history.label': 'Activity',
        'cancel-edit.label': 'Cancel',
        'question-answer.label': 'Your answer',
        'question-answer.placeholder': 'Type an answer…',
        'question-submit.label': 'Answer',
        'remove-file.label': 'Remove {{name}}',
      },
    },
  },
] as const satisfies Resource[];
