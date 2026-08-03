//
// Copyright 2026 DXOS.org
//

import { Project } from '@dxos/compute';
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
        'goals.label': 'Goals',
        'tasks.label': 'Tasks',
        'routines.label': 'Routines',
        'artifacts.label': 'Artifacts',
        'create-panel.name.placeholder': 'Project name (optional)',
        'create-panel.template.placeholder': 'Filter templates…',
        'setup-project.label': 'Set up project',
        'create-chat.label': 'New chat',
        'create-routine.label': 'New routine',
        'object-card.untitled.label': 'Untitled',
        'object-card.delete.label': 'Delete',
      },
    },
  },
] as const satisfies Resource[];
