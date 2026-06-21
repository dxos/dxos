//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';
import { Pipeline } from '@dxos/types';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Pipeline.Pipeline)]: {
        'typename.label': 'Pipeline',
        'typename.label_zero': 'Pipelines',
        'typename.label_one': 'Pipeline',
        'typename.label_other': 'Pipelines',
        'object-name.placeholder': 'New pipeline',
        'add-object.label': 'Add pipeline',
        'rename-object.label': 'Rename pipeline',
        'delete-object.label': 'Delete pipeline',
        'object-deleted.label': 'Pipeline deleted',
      },
      [meta.profile.key]: {
        'plugin.name': 'Pipelines',
        'add-column.label': 'Add column',
        'add-card.label': 'Add object',
        'untitled-column.title': 'New column',
        'enumerating-tab.label': 'List',
        'editing-tab.label': 'Edit',
        'columns.label': 'Columns',
        'pipeline-invocations.label': 'Invocations',
        'pipeline-automation.label': 'Automations',
        'toggle-expand.label': 'Toggle expand',
        'delete-column.label': 'Delete column',
      },
    },
  },
] as const satisfies Resource[];
