//
// Copyright 2026 DXOS.org
//

import { type Projection } from '../types';

/**
 * A hand-written projection with no DSL behind it — the fixture that proves the renderer depends on
 * the neutral model alone. Also covers compartments and several ports on one side.
 */
export const CLASS_DIAGRAM: Projection = {
  graph: {
    nodes: [
      {
        id: 'Shape',
        type: 'node',
        label: 'Shape',
        size: { width: 200, height: 118 },
        compartments: [
          { id: 'fields', label: 'fields', lines: ['id: string', 'bounds: Rect'] },
          { id: 'methods', label: 'methods', lines: ['draw(): void'] },
        ],
        ports: [
          { id: 'n', side: 'top', offset: 0.5 },
          { id: 's', side: 'bottom', offset: 0.5 },
          { id: 'e1', side: 'right', offset: 0.25 },
          { id: 'e2', side: 'right', offset: 0.5 },
          { id: 'e3', side: 'right', offset: 0.75 },
        ],
      },
      {
        id: 'Rect',
        type: 'node',
        label: 'Rect',
        size: { width: 160, height: 84 },
        compartments: [{ id: 'fields', label: 'fields', lines: ['radius: number'] }],
        ports: [
          { id: 'n', side: 'top', offset: 0.5 },
          { id: 's', side: 'bottom', offset: 0.5 },
        ],
      },
    ],
    // The ontology would annotate an inheritance link as vertical-only.
    edges: [
      { id: 'Rect->Shape', type: 'inheritance', source: 'Rect', target: 'Shape', sourcePort: 'n', targetPort: 's' },
    ],
  },
};
