//
// Copyright 2025 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { CodeProject, Spec } from '#types';

export const translations = [
  {
    'en-US': {
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
      [Type.getTypename(CodeProject.CodeProject)]: {
        'typename.label': 'Code Project',
        'typename.label_zero': 'Code Projects',
        'typename.label_one': 'Code Project',
        'typename.label_other': 'Code Projects',
        'object-name.placeholder': 'New code project',
        'add-object.label': 'Add code project',
        'rename-object.label': 'Rename code project',
        'delete-object.label': 'Delete code project',
        'object-deleted.label': 'Code project deleted',
      },
      [meta.id]: {
        'plugin.name': 'Code',
        'view.spec.label': 'Spec',
        'view.code.label': 'Code',
        'view.code.placeholder': 'Build output will appear here.',
        'api-key.label': 'Anthropic API key',
        'api-key.placeholder.empty': 'sk-ant-…',
        'api-key.placeholder.set': '•••• (set)',
        'api-key.save.label': 'Save',
        'api-key.clear.label': 'Clear',
        'endpoint.label': 'Build service endpoint',
        'endpoint.placeholder': 'Default',
      },
    },
  },
] as const satisfies Resource[];
