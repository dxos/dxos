//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { Model, Scene } from './types';

export const translations = [
  {
    'en-US': {
      [Scene.Scene.typename]: {
        'typename.label': 'Scene',
        'typename.label_zero': 'Scenes',
        'typename.label_one': 'Scene',
        'typename.label_other': 'Scenes',
        'object-name.placeholder': 'New scene',
        'add-object.label': 'Add scene',
        'rename-object.label': 'Rename scene',
        'delete-object.label': 'Delete scene',
        'object-deleted.label': 'Scene deleted',
      },
      [Model.Object.typename]: {
        'typename.label': 'Object',
        'typename.label_zero': 'Objects',
        'typename.label_one': 'Object',
        'typename.label_other': 'Objects',
      },
      [meta.id]: {
        'plugin.name': 'Spacetime',
        'settings.title': 'Spacetime settings',
        'settings-show-axes.label': 'Show axes',
        'settings-show-fps.label': 'Show FPS',
        'tool.label': 'Tool',
        'tool.select.label': 'Select',
        'tool.create.label': 'Create',
        'tool.delete.label': 'Delete',
        'tool.extrude.label': 'Extrude',
      },
    },
  },
] as const satisfies Resource[];
