//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import type * as Theme from '@dxos/react-ui/Theme';

import { meta } from '#meta';
import { CodeGraph } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(CodeGraph.CodeGraph)]: {
        'typename.label': 'Code Graph',
        'typename.label_zero': 'Code Graphs',
        'typename.label_one': 'Code Graph',
        'typename.label_other': 'Code Graphs',
        'object-name.placeholder': 'New code graph',
        'add-object.label': 'Add code graph',
        'rename-object.label': 'Rename code graph',
        'delete-object.label': 'Delete code graph',
        'object-deleted.label': 'Code graph deleted',
      },
      [meta.profile.key]: {
        'plugin.name': 'Code Graph',
        'layout.label': 'Layout',
        'layout-illustrator.label': 'Illustrator layout',
        'layout-force.label': 'Force-directed layout',
        'layout-rank.label': 'Rank layout',
        'layout-diagram.label': 'Illustrator drawing',
        'reset-positions.label': 'Reset positions',
        'empty.message': 'Ask the assistant to draw part of the codebase here.',
        'expand-out.label': 'Expand dependencies',
        'expand-in.label': 'Expand dependents',
        'remove-node.label': 'Remove',
        'close-details.label': 'Close',
      },
    },
  },
] as const satisfies Theme.Resource[];
