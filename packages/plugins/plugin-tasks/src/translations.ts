//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';
import { translations as taskTranslations } from '@dxos/react-ui-task/translations';
import { Outline, RemoteSession } from '@dxos/types';

import { meta } from '#meta';
import { Journal } from '#types';

export const translations = [
  ...taskTranslations,
  {
    'en-US': {
      [Type.getTypename(Journal.Journal)]: {
        'typename.label': 'Journal',
        'typename.label_zero': 'Journals',
        'typename.label_one': 'Journal',
        'typename.label_other': 'Journals',
        'object-name.placeholder': 'New journal',
        'add-object.label': 'Add journal',
        'rename-object.label': 'Rename journal',
        'delete-object.label': 'Delete journal',
        'object-deleted.label': 'Journal deleted',
      },
      [Type.getTypename(Outline.Outline)]: {
        'typename.label': 'Outline',
        'typename.label_zero': 'Outlines',
        'typename.label_one': 'Outline',
        'typename.label_other': 'Outlines',
        'object-name.placeholder': 'New outline',
        'add-object.label': 'Add outline',
        'rename-object.label': 'Rename outline',
        'delete-object.label': 'Delete outline',
        'object-deleted.label': 'Outline deleted',
      },
      [Type.getTypename(RemoteSession.RemoteSession)]: {
        'typename.label': 'Agent session',
        'typename.label_zero': 'Agent sessions',
        'typename.label_one': 'Agent session',
        'typename.label_other': 'Agent sessions',
        'object-name.placeholder': 'New agent session',
        'rename-object.label': 'Rename agent session',
        'delete-object.label': 'Delete agent session',
        'object-deleted.label': 'Agent session deleted',
      },
      [meta.profile.key]: {
        'plugin.name': 'Tasks',
        'task-artifacts.label': 'Artifacts',
        'task-set.tasks.label': 'Tasks',
        'task-create.placeholder': 'Add task',
        'filter.label': 'Filter tasks',
        'filter.placeholder': 'Filter',
        'filter-clear.label': 'Clear filter',
        'backlog.label': 'Backlog',
        'milestone-progress.label': '{{done}}/{{total}}',
        'delete-object.label': 'Delete object',
        'delete-task.label': 'Delete task',
        'task-deleted.label': 'Task deleted',
        'tasks-deleted.label': 'Tasks deleted',
        'create-outline.label': 'Create outline',
        'text.placeholder': 'Enter text...',
        'menu.label': 'Menu',

        'meeting-notes.label': 'Notes',
        'today.label': 'Today',
        'start-today.label': "Start today's entry",
        'toggle-calendar.label': 'Toggle calendar',

        'quick-entry.label': 'Add journal entry',
        'quick-entry-dialog.title': 'Quick Journal Entry',
        'quick-entry.placeholder': 'Write something...',
        'quick-entry-cancel.label': 'Cancel',
        'quick-entry-save.label': 'Save',
        'quick-entry-save-and-continue.label': 'Save & Add Another',

        'delete-row.menu': 'Delete row',
        'convert-to-task.menu': 'Convert to task',

        'back.label': 'Back to outline',
      },
    },
  },
] as const satisfies Resource[];
