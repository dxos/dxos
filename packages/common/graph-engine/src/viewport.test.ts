//
// Copyright 2026 DXOS.org
//

import { zoomIdentity } from 'd3';
import { describe, test } from 'vitest';

import { Viewport } from './viewport';

describe('Viewport', () => {
  test('default scale is 1, transform is identity', ({ expect }) => {
    const v = new Viewport();
    expect(v.scale).toBe(1);
    expect(v.transform.k).toBe(1);
  });

  test('worldToScreen and screenToWorld are inverse', ({ expect }) => {
    const v = new Viewport();
    v.setSize({ width: 200, height: 100 });
    v.setTransform(zoomIdentity.translate(10, 20).scale(2));
    const screen = v.worldToScreen([3, 4]);
    const world = v.screenToWorld(screen);
    expect(world[0]).toBeCloseTo(3);
    expect(world[1]).toBeCloseTo(4);
  });

  test('setSize emits resized', ({ expect }) => {
    const v = new Viewport();
    let fired = 0;
    v.resized.on(() => fired++);
    v.setSize({ width: 100, height: 50 });
    v.setSize({ width: 100, height: 50 }); // no change → no fire
    v.setSize({ width: 200, height: 50 });
    expect(fired).toBe(2);
  });

  test('frame emits and carries timestamp', ({ expect }) => {
    const v = new Viewport();
    const events: number[] = [];
    v.frame.on(({ t }) => events.push(t));
    v.tick(0);
    v.tick(16);
    expect(events).toEqual([0, 16]);
  });
});
