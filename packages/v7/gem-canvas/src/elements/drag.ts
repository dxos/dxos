//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import type { DragBehavior } from 'd3';

import { Bounds, Point, Scale, createBounds } from '@dxos/gem-x';

import { D3DragEvent } from '../types';

export type EventMod = { center?: boolean, constrain?: boolean }

export const getEventMod = (event: KeyboardEvent) => ({
  center: event.metaKey,
  constrain: event.shiftKey
});

/**
 * Drag handler to compute bounds for creating and resizing elements.
 * @param scale
 * @param onUpdate
 * @param onStart
 */
// TODO(burdon): Create type for modifiers.
export const dragBounds = (
  scale: Scale,
  onUpdate: (bounds: Bounds, mod: EventMod, commit?: boolean) => void,
  onStart?: () => void
): DragBehavior<any, any, any> => {
  let start: Point;

  return d3.drag()
    .on('start', (event: D3DragEvent) => {
      start = scale.snap(scale.translatePoint([event.x, event.y]));
      onStart?.();
    })
    .on('drag', (event: D3DragEvent) => {
      const mod = getEventMod(event.sourceEvent);
      const current: Point = scale.translatePoint([event.x, event.y]);
      const bounds = createBounds(start, current);
      onUpdate(bounds, mod);
    })
    .on('end', (event: D3DragEvent) => {
      const mod = getEventMod(event.sourceEvent);
      const current: Point = scale.translatePoint([event.x, event.y]);
      const bounds = createBounds(start, current);
      onUpdate(bounds, mod, true);
    });
};

/**
 * Drag handler to compute delta for moving elements.
 * @param onMove
 */
export const dragMove = (
  onMove: (delta: Point, mod: EventMod, commit?: boolean) => void
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
