//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';

import { Bounds, Point, Scale, createBounds } from '@dxos/gem-x';

import { Element, ElementDataType, ElementType } from '../../model';
import { D3Callable, D3DragEvent, D3Selection } from '../../types';

/**
 * Render mode.
 */
// TODO(burdon): Move defs.
export enum Mode {
  DEFAULT,
  HIGHLIGHT, // Show connection points.
  CREATE, // Being created.
  UPDATE // Update handles.
}

/**
 * Drag handler to compute delta for moving elements.
 * @param onMove
 */
export const dragMove = (onMove: (delta: Point, commit?: boolean) => void): D3Callable => {
  let start: Point;

  return d3.drag()
    .on('start', (event: D3DragEvent) => {
      start = [event.x, event.y];
    })
    .on('drag', (event: D3DragEvent) => {
      const current: Point = [event.x, event.y];
      onMove([current[0] - start[0], current[1] - start[1]]);
    })
    .on('end', (event: D3DragEvent) => {
      const current: Point = [event.x, event.y];
      onMove([current[0] - start[0], current[1] - start[1]], true);
    });
};

/**
 * Drag handler to compute bounds for creating and resizing elements.
 * @param scale
 * @param onUpdate
 */
export const dragBounds = (scale: Scale, onUpdate: (event: D3DragEvent, bounds: Bounds, commit?: boolean) => void): D3Callable => {
  let start: Point;

  return d3.drag()
    .on('start', (event: D3DragEvent) => {
      start = scale.translatePoint([event.x, event.y]);
    })
    .on('drag', (event: D3DragEvent) => {
      const current: Point = scale.translatePoint([event.x, event.y]);
      const bounds = createBounds(start, current);
      onUpdate(event, bounds);
    })
    .on('end', (event: D3DragEvent) => {
      const current: Point = scale.translatePoint([event.x, event.y]);
      const bounds = createBounds(start, current);
      onUpdate(event, bounds, true);
    });
};

/**
 * Properties for drag handler to create element.
 */
export interface DragElementProps<T extends ElementDataType> {
  scale: Scale
  onCancel: () => void
  onCreate: (type: ElementType, data: T, commit: boolean) => void
}

export type DragElementFunction<T extends ElementDataType> = (props: DragElementProps<T>) => D3Callable

/**
 * Properties for element renderer.
 */
export interface DrawElementProps<T extends ElementDataType> {
  scale: Scale
  group: D3Selection
  element?: Element
  data: T
  mode?: Mode
  editable?: boolean
  onUpdate?: (element: Element, data: T, commit: boolean) => void
  onEdit?: () => void
}

export type DrawElementFunction<T extends ElementDataType> = (props: DrawElementProps<T>) => void
