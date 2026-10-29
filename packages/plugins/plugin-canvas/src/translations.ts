//
// Copyright 2026 DXOS.org
//

import type * as Theme from '@dxos/react-ui/Theme';

import { CanvasNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [CanvasNamespace.key]: {
        'plugin.name': 'Canvas',
        'variant.label': 'Canvas',
        'lock-drawing.label': 'Read only',
        'unlock-drawing.label': 'Edit drawing',
        'newer-format.title': 'Read only',
        'tool.select.label': 'Select',
        'tool.move.label': 'Move',
        'tool.rotate.label': 'Rotate',
        'tool.scale.label': 'Scale',
        'tool.link.label': 'Link',
        'tool.extrude.label': 'Extrude face',
        'join.label': 'Join',
        'subtract.label': 'Subtract',
        'import-mesh.label': 'Import mesh (OBJ, GLB)',
        'export-stl.label': 'Export STL',
        'tool.cube.label': 'Cube',
        'tool.sphere.label': 'Sphere',
        'tool.cylinder.label': 'Cylinder',
        'tool.cone.label': 'Cone',
        'group.label': 'Group',
        'ungroup.label': 'Ungroup',
        'delete.label': 'Delete',
        'make-object.label': 'Make object',
        'library.label': 'Library',
        'library.place.label': 'Place',
        'library.edit-parts.label': 'Edit parts',
        'library.empty.message': 'No objects. Select elements and choose Make object.',
        'undo.label': 'Undo',
        'redo.label': 'Redo',
        'newer-format.message':
          'A newer version of the Canvas plugin saved this drawing. Update the plugin to edit it.',
      },
    },
  },
] as const satisfies Theme.Resource[];
