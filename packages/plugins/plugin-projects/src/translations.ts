//
// Copyright 2026 DXOS.org
//

import * as Project from '@dxos/compute/Project';
import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

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
      [meta.profile.key]: {
        'plugin.name': 'Projects',
        'project.label': 'Project',
        'projects.label': 'Projects',
        'instructions.label': 'Instructions',
        'context.label': 'Context',
        'milestones.label': 'Milestones',
        'overview.label': 'Overview',
        'tasks.label': 'Tasks',
        'no-task-set.message': 'This project has no task set yet.',
        'artifacts.label': 'Artifacts',
        'artifacts-empty.message': 'This project has no artifacts yet.',
        'chats.label': 'Chats',
        'chats-empty.message': 'This project has no chats yet.',
        'outline.label': 'Outline',
        'create-artifact.label': 'Create artifact',
        'create-chat.label': 'Create chat',
        'create-panel.name.placeholder': 'Project name (optional)',
        'create-panel.template.placeholder': 'Filter templates…',
        'setup-project.label': 'Set up project',
        'object-card.untitled.label': 'Untitled',
        'object-card.delete.label': 'Delete',
      },
    },
  },
] as const satisfies Resource[];
