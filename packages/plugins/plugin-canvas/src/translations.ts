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
        'tool.select.label': 'Select',
        'tool.orbit.label': 'Orbit',
        'face.label': 'Face',
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
        'properties.label': 'Properties',
        'theme.cad.label': 'CAD',
        'theme.presentation.label': 'Presentation',
        'cut.label': 'Cut',
        'copy.label': 'Copy',
        'paste.label': 'Paste',
        'duplicate.label': 'Duplicate',
        'paste.refused.message': 'Cannot paste an object inside its own parts.',
        'undo.label': 'Undo',
        'redo.label': 'Redo',
      },
    },
  },
] as const satisfies Theme.Resource[];
