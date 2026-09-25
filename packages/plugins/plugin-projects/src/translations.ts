//
// Copyright 2026 DXOS.org
//

import * as Project from '@dxos/compute/Project';
import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';
import { Repo } from '@dxos/types';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Project.Project)]: {
        'typename.label': 'Project',
        'typename.label_zero': 'Projects',
        'typename.label_one': 'Project',
        'typename.label_other': 'Projects',
        'object-name.placeholder': 'New project',
        'rename-object.label': 'Rename project',
        'delete-object.label': 'Delete project',
        'object-deleted.label': 'Project deleted',
      },
      [Type.getTypename(Repo.Repo)]: {
        'typename.label': 'Repository',
        'typename.label_zero': 'Repositories',
        'typename.label_one': 'Repository',
        'typename.label_other': 'Repositories',
        'object-name.placeholder': 'owner/name',
        'rename-object.label': 'Rename repository',
        'delete-object.label': 'Delete repository',
        'object-deleted.label': 'Repository deleted',
      },
      [meta.profile.key]: {
        'plugin.name': 'Projects',
        'project-tour.label': 'Take the project tour',
        'project.label': 'Project',
        'projects.label': 'Projects',
        'instructions.label': 'Instructions',
        'context.label': 'Context',
        'milestones.label': 'Milestones',
        'views.label': 'Views',
        'overview.label': 'Overview',
        'tasks.label': 'Tasks',
        'view.label': 'View',
        'pipeline.label': 'Show pipeline',
        'no-sessions.message': 'No agent sessions yet. Assign tasks to an agent to start one.',
        'no-task-set.message': 'This project has no task set yet.',
        'artifacts.label': 'Artifacts',
        'artifacts-empty.message': 'This project has no artifacts yet.',
        'task-companion.label': 'Task',
        'no-task-selected.message': 'Select a task.',
        'chats.label': 'Sessions',
        'chats-empty.message': 'This project has no sessions yet.',
        'outline.label': 'Notes',
        'outline.description':
          'Notes are a scratch surface for the project. Use the menu to promote items into assignable tasks.',
        'create-artifact.label': 'Create artifact',
        'remove-from-project.label': 'Remove from project',
        'create-chat.label': 'Create session',
        'delegate-tasks.label': 'Assign selected tasks to agent',
        'create-panel.name.placeholder': 'Project name (optional)',
        'create-panel.template.placeholder': 'Filter templates…',
        'setup-project.label': 'Set up project',
        'object-card.untitled.label': 'Untitled',
        'object-card.delete.label': 'Delete',
        'object-card.archived.label': 'Archived',
      },
    },
  },
] as const satisfies Resource[];
