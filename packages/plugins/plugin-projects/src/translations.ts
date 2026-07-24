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
        'project.threads.label': 'Threads',
        'project.questions.label': 'Questions',
        'project.tasks.label': 'Tasks',
      },
    },
  },
] as const satisfies Resource[];
