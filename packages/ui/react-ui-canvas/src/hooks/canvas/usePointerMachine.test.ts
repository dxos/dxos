//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { endDrop, isLinkDrawn } from './usePointerMachine.ts';

describe('endDrop', () => {
  const to = { x: 40, y: 20 };

  test('an end pressed and released where it was stays attached as it was', ({ expect }) => {
    expect(endDrop({ to })).toBeUndefined();
  });

  test('an end dragged lands on what the pointer was over, else free at the point', ({ expect }) => {
    expect(endDrop({ to, moved: true, target: { node: 'a', port: 'e2' } })).toEqual({ node: 'a', port: 'e2' });
    expect(endDrop({ to, moved: true })).toEqual({ point: to });
  });
});

describe('isLinkDrawn', () => {
  const grid = 16;

  test('a link is drawn once the pointer has gone a grid cell from where it was pressed', ({ expect }) => {
    const press = { x: 100, y: 100 };
    expect(isLinkDrawn({ press, pointer: press }, grid)).toBe(false);
    expect(isLinkDrawn({ press, pointer: { x: 110, y: 104 } }, grid)).toBe(false);
    expect(isLinkDrawn({ press, pointer: { x: 116, y: 100 } }, grid)).toBe(true);
    expect(isLinkDrawn({ press, pointer: { x: 88, y: 88 } }, grid)).toBe(true);
  });

  test('a pointer that crosses a grid line by a few pixels has not drawn a link, though its end snapped a cell on', ({
    expect,
  }) => {
    // Pressed just short of the line at 104, which the free end snaps across as the pointer moves 3 px: the ends
    // are then a whole cell apart (96 to 112), and the pointer has gone 3 px.
    const drag = {
      from: { x: 96, y: 96 },
      to: { x: 112, y: 96 },
      press: { x: 103, y: 100 },
      pointer: { x: 106, y: 102 },
    };
    expect(Math.hypot(drag.to.x - drag.from.x, drag.to.y - drag.from.y)).toBe(grid);
    expect(isLinkDrawn(drag, grid)).toBe(false);
  });
});
