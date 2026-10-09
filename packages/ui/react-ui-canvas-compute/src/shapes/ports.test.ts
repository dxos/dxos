//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DEFAULT_GRID, nominalSize } from '@dxos/react-ui-canvas/scene';

import { computeNodeDefs } from '../registry.ts';

describe('compute ports', () => {
  test('every port of a new shape sits on a minor grid line', ({ expect }) => {
    for (const def of computeNodeDefs) {
      const size = nominalSize(def.defaultSize);
      const node = def.create({ id: 'n', z: 'a0', center: { x: size.width / 2, y: size.height / 2 }, size });
      for (const port of def.ports?.(node) ?? []) {
        const along = port.side === 'w' || port.side === 'e' ? size.height : size.width;
        // Distance from the node's top (or left) edge, which snaps to the grid.
        expect(`${def.type} ${port.id} ${(port.offset * along) % DEFAULT_GRID}`).toBe(`${def.type} ${port.id} 0`);
      }
    }
  });
});
