//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { nominalSize } from '@dxos/react-ui-canvas';
import { DEFAULT_GRID } from '@dxos/scene';

import { computeNodeDefs } from '../registry.ts';

describe('compute ports', () => {
  test('every port of a new shape sits on a minor grid line', ({ expect }) => {
    for (const def of computeNodeDefs) {
      const size = nominalSize(def.defaultSize);
      const node = def.create({ id: 'n', z: 'a0', center: { x: size.width / 2, y: size.height / 2 }, size });
      for (const port of def.ports?.(node) ?? []) {
        const along = port.side === 'w' || port.side === 'e' ? size.height : size.width;
        // Distance from the node's top (or left) edge, which snaps to the grid; an offset is a fraction of the
        // node, so the distance is read to the nearest line rather than by a remainder a float cannot land on.
        const distance = port.offset * along;
        const off = Math.abs(distance - Math.round(distance / DEFAULT_GRID) * DEFAULT_GRID);
        expect(`${def.type} ${port.id} ${off < 1e-9 ? 0 : off}`).toBe(`${def.type} ${port.id} 0`);
      }
    }
  });
});
