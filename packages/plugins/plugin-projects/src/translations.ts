//
// Copyright 2026 DXOS.org
//

import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Type } from '@dxos/echo';
import type * as Theme from '@dxos/react-ui/Theme';
import { Repo } from '@dxos/types';

import { ProjectsNamespace } from './namespace.ts';

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
      [Type.getTypename(Spec.Spec)]: {
        'typename.label': 'Spec',
        'typename.label_zero': 'Specs',
        'typename.label_one': 'Spec',
        'typename.label_other': 'Specs',
        'object-name.placeholder': 'New spec',
        'add-object.label': 'Add spec',
        'rename-object.label': 'Rename spec',
        'delete-object.label': 'Delete spec',
        'object-deleted.label': 'Spec deleted',
      },
      [ProjectsNamespace.key]: {
        'plugin.name': 'Projects',
        'project-tour.label': 'Take the project tour',
        'project.label': 'Project',
        'projects.label': 'Projects',
        'instructions.label': 'Instructions',
        'context.label': 'Context',
        'config.label': 'Config',
        'agent-config.label': 'Agent',
        'skills.label': 'Skills',
        'project-description.placeholder': 'What is this project for?',
        'milestones.label': 'Milestones',
        'views.label': 'Views',
        'overview.label': 'Overview',
        'specs.label': 'Specs',
        'add-spec.label': 'Add spec',
        'spec-extensions.label': 'Extensions',
        'untitled-spec.label': 'Untitled spec',
        'spec.empty.message': 'No spec yet. A spec describes what this work delivers.',
        'level-spec.empty.message': 'This level has no spec of its own. Add one to break it down.',
        'spec-view.label': 'View',
        'spec-view.document.label': 'Spec text',
        'tasks.label': 'Tasks',
        'view.label': 'View',
        'show-pipeline.label': 'Show pipeline',
        'hide-pipeline.label': 'Hide pipeline',
        'no-sessions.message': 'No agent sessions yet. Delegate tasks to an agent to start one.',
        'no-task-set.message': 'This project has no task set yet.',
        'artifacts.label': 'Artifacts',
        'artifacts-empty.message': 'This project has no artifacts yet.',
        'show-all-artifacts.label': 'Show all ({{count}})',
        'show-fewer-artifacts.label': 'Show fewer',
        'chats.label': 'Sessions',
        'chats-empty.message': 'This project has no sessions yet.',
        'outline.label': 'Notes',
        'outline.description':
          'Notes are a scratch surface for the project. Use the menu to promote items into assignable tasks.',
        'create-artifact.label': 'Create artifact',
        'remove-from-project.label': 'Remove from project',
        'move-task-dialog.title': 'Move task to project',
        'move-task.placeholder': 'Search projects…',
        'move-task-empty.message': 'There are no other projects in this space.',
        'move-task-error.title': 'The task could not be moved',
        'untitled-project.label': 'Untitled project',
        'create-chat.label': 'Create session',
        'delegate-tasks.label': 'Delegate selected tasks to agent',
        'create-panel.name.placeholder': 'Project name (optional)',
        'create-panel.template.placeholder': 'Filter templates…',
        'setup-project.label': 'Set up project',
        'object-card.untitled.label': 'Untitled',
        'object-card.delete.label': 'Delete',
        'object-card.archived.label': 'Archived',
        'object-card.menu.label': 'Object actions',
      },
    },
  },
] as const satisfies Theme.Resource[];
