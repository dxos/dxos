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
        'routines.label': 'Routines',
        'artifacts.label': 'Artifacts',
        'create-chat.label': 'New chat',
        'artifact-card.untitled.label': 'Untitled',
        'artifact-card.options.label': 'Options',
        'artifact-card.delete.label': 'Delete',
      },
    },
  },
] as const satisfies Resource[];
