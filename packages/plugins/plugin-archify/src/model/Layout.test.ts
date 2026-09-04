//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Ir from './Ir';
import * as Layout from './Layout';
import { webApp } from './testing';

const minimal = (components: Ir.Architecture['components'], rest: Partial<Ir.Architecture> = {}): Ir.Architecture => ({
  schema_version: 1,
  diagram_type: 'architecture',
  meta: { title: 'test' },
  components,
  ...rest,
});

describe('layout', () => {
  test('grid cells resolve to fixed coordinates and absolute pos wins over them', ({ expect }) => {
    const [ox, oy] = Layout.DEFAULT_GRID.origin;
    expect(Layout.resolvePos({ id: 'a', type: 'backend', label: 'a', row: 1, col: 2 }, Layout.DEFAULT_GRID)).toEqual([
      ox + 2 * (Layout.DEFAULT_GRID.cellW + Layout.DEFAULT_GRID.gapX),
      oy + 1 * (Layout.DEFAULT_GRID.cellH + Layout.DEFAULT_GRID.gapY),
    ]);
    expect(Layout.resolvePos({ id: 'a', type: 'backend', label: 'a', row: 1, col: 2, pos: [7, 9] }, Layout.DEFAULT_GRID)).toEqual([
      7, 9,
    ]);
    // Without a grid there is nothing to place a row/col component against.
    expect(Layout.resolvePos({ id: 'a', type: 'backend', label: 'a', row: 1, col: 2 })).toEqual([NaN, NaN]);
  });

  test('a boundary frame is derived from its members, never authored', ({ expect }) => {
    const { boundaries } = Layout.resolve(
      minimal(
        [
          { id: 'a', type: 'backend', label: 'a', pos: [100, 100], size: [100, 50] },
          { id: 'b', type: 'backend', label: 'b', pos: [300, 200], size: [100, 50] },
        ],
        { boundaries: [{ kind: 'region', label: 'vpc', wraps: ['a', 'b'] }] },
      ),
    );

    expect(boundaries).toHaveLength(1);
    const [frame] = boundaries;
    expect(frame.x).toBe(70);
    expect(frame.x + frame.width).toBe(430);
    // Top padding clears the label baseline; the bottom carries the extra 20px.
    expect(frame.y).toBe(70);
    expect(frame.y + frame.height).toBe(270);
  });

  test('a route leaves the chosen side and arrives against the target side', ({ expect }) => {
    const { connections } = Layout.resolve(
      minimal(
        [
          { id: 'a', type: 'backend', label: 'a', pos: [0, 0], size: [100, 50] },
          { id: 'b', type: 'backend', label: 'b', pos: [300, 200], size: [100, 50] },
        ],
        { connections: [{ from: 'a', to: 'b', fromSide: 'right', toSide: 'left' }] },
      ),
    );

    const [{ points }] = connections;
    expect(points[0]).toEqual([100, 25]);
    expect(points[points.length - 1]).toEqual([300, 225]);
    // Leaves rightwards, arrives from the left: a horizontal-first dogleg.
    expect(points[1][0]).toBeGreaterThan(points[0][0]);
  });

  test('explicit waypoints are used verbatim', ({ expect }) => {
    const { connections } = Layout.resolve(
      minimal(
        [
          { id: 'a', type: 'backend', label: 'a', pos: [0, 0], size: [100, 50] },
          { id: 'b', type: 'backend', label: 'b', pos: [300, 0], size: [100, 50] },
        ],
        { connections: [{ from: 'a', to: 'b', via: [[200, -80]] }] },
      ),
    );

    expect(connections[0].points).toEqual([
      [100, 25],
      [200, -80],
      [300, 25],
    ]);
  });

  test('the same document always resolves to the same geometry', ({ expect }) => {
    expect(Layout.resolve(webApp)).toEqual(Layout.resolve(webApp));
  });

  test('the viewBox covers every rect and route', ({ expect }) => {
    const resolved = Layout.resolve(webApp);
    const [minX, minY, width, height] = resolved.viewBox.split(' ').map(Number);
    for (const component of resolved.components) {
      expect(component.x).toBeGreaterThanOrEqual(minX);
      expect(component.y).toBeGreaterThanOrEqual(minY);
      expect(component.x + component.width).toBeLessThanOrEqual(minX + width);
      expect(component.y + component.height).toBeLessThanOrEqual(minY + height);
    }
  });

  test('reach walks connections in the requested direction', ({ expect }) => {
    expect([...Layout.reach(webApp, ['lb'], 'downstream')].sort()).toEqual(['api', 'cache', 'db', 'lb', 'queue', 'worker']);
    expect([...Layout.reach(webApp, ['lb'], 'upstream')].sort()).toEqual(['cdn', 'lb', 'users']);
  });
});
