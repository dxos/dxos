//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import type { DragBehavior } from 'd3';

import { Modifiers, Point, Scale, Screen, ScreenBounds } from '@dxos/gem-x';

import { D3DragEvent } from '../types';

export const getEventMod = (event: KeyboardEvent): Modifiers => ({
  center: event.metaKey,
  constrain: event.shiftKey
});

/**
 * Drag handler to compute bounds for creating and resizing elements.
 * NOTE: Event (x, y) coordinates are relative the the drag container.
 * https://github.com/d3/d3-drag/blob/main/README.md#drag_container
 * @param scale
 * @param onUpdate
 * @param onStart
 */
// TODO(burdon): Event x, y is wrong if grid is translated (needs to be mapped).
export const dragBounds = (
  scale: Scale,
  onUpdate: (bounds: ScreenBounds, mod: Modifiers, commit?: boolean) => void,
  onStart?: () => void
): DragBehavior<any, any, any> => {
  let start: Point;

  return d3.drag()
    .on('start', (event: D3DragEvent) => {
      start = scale.screen.snapPoint([event.x, event.y]);
      onStart?.();
    })
    .on('drag', (event: D3DragEvent) => {
      const mod = getEventMod(event.sourceEvent);
      const current: Point = [event.x, event.y];
      const bounds = Screen.createBounds(start, current, mod);
      onUpdate(bounds, mod);
    })
    .on('end', (event: D3DragEvent) => {
      const mod = getEventMod(event.sourceEvent);
      const current: Point = scale.screen.snapPoint([event.x, event.y]);
      const bounds = Screen.createBounds(start, current, mod);
      onUpdate(bounds, mod, true);
    });
};

/**
 * Drag handler to compute delta for moving elements.
 * NOTE: Event (x, y) coordinates are relative the the drag container.
 * https://github.com/d3/d3-drag/blob/main/README.md#drag_container
 * @param onMove
 */
export const dragMove = (
  onMove: (delta: Point, mod: Modifiers, commit?: boolean) => void
): DragBehavior<any, any, any> => {
  let start: Point;

  return d3.drag()
    .on('start', (event: D3DragEvent) => {
      start = [event.x, event.y];
    })
    .on('drag', (event: D3DragEvent) => {
      const mod = getEventMod(event.sourceEvent);
      const current: Point = [event.x, event.y];
      const delta: Point = [current[0] - start[0], current[1] - start[1]];
      if (delta[0] || delta[1]) {
        onMove(delta, mod);
      }
    })
    .on('end', (event: D3DragEvent) => {
      const mod = getEventMod(event.sourceEvent);
      const current: Point = [event.x, event.y];
      const delta: Point = [current[0] - start[0], current[1] - start[1]];
      if (delta[0] || delta[1]) {
        onMove(delta, mod, true);
      }
    });
};
