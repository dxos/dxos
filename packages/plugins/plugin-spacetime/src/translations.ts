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

        'selection-mode.label': 'Selection mode',
        'selection-mode.object.label': 'Object',
        'selection-mode.face.label': 'Face',

        'tool.label': 'Tool',
        'tool.select.label': 'Select',
        'tool.create.label': 'Create',
        'tool.delete.label': 'Delete',
        'tool.move.label': 'Move',
        'tool.extrude.label': 'Extrude',

        'template.label': 'Object type',

        'action.add-object.label': 'Add object',
        'action.delete-object.label': 'Delete object',
        'action.import.label': 'Import',
        'action.join-objects.label': 'Join',
        'action.subtract-objects.label': 'Subtract',
        'action.export.label': 'Export',

        'view.label': 'View',
        'view.grid.label': 'Grid',
        'view.debug.label': 'Debug',
      },
    },
  },
] as const satisfies Resource[];
