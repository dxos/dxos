//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';

import { Modifiers, Point, Scale, Screen, ScreenBounds } from '@dxos/gem-core';

import { ElementId } from '../model';
import { D3Callable, D3DragEvent, D3Selection } from '../types';
import { Control } from './control';
import { getEventMod } from './drag';

const FrameProps = {
  controlRadius: 7,
  connectionRadius: 9
};

/**
 * Moveable control handle (e.g., for path).
 */
export type ControlHandle = {
  i: number
  point: Point
}

/**
 * Frame handle (resize or connection).
 */
export type Handle = {
  type: string
  id: string
  p: Point // TODO(burdon): Rename delta?
  cursor?: string
}

/**
 * Reference to connection point.
 */
export type Connection = {
  handle?: string
  id?: ElementId
}

// https://developer.mozilla.org/en-US/docs/Web/CSS/cursor

const resizeHandles: Handle[] = [
  { type: 'resize', id: 'n-resize', p: [0, 1], cursor: 'ns-resize' },
  { type: 'resize', id: 'ne-resize', p: [1, 1], cursor: 'nesw-resize' },
  { type: 'resize', id: 'e-resize', p: [1, 0], cursor: 'ew-resize' },
  { type: 'resize', id: 'se-resize', p: [1, -1], cursor: 'nwse-resize' },
  { type: 'resize', id: 's-resize', p: [0, -1], cursor: 'ns-resize' },
  { type: 'resize', id: 'sw-resize', p: [-1, -1], cursor: 'nesw-resize' },
  { type: 'resize', id: 'w-resize', p: [-1, 0], cursor: 'ew-resize' },
  { type: 'resize', id: 'nw-resize', p: [-1, 1], cursor: 'nwse-resize' }
];

const connectionHandles: Handle[] = [
  { type: 'connection', id: 'n', p: [0, 1] },
  { type: 'connection', id: 'e', p: [1, 0] },
  { type: 'connection', id: 's', p: [0, -1] },
  { type: 'connection', id: 'w', p: [-1, 0] },
]

export const getConectionHandle = (handleId: string): Handle => connectionHandles.find(({ id }) => id === handleId);

export const getConnection = (event): Connection => {
  const handle = d3.select<any, Handle>(event.target).datum();
  if (handle?.type !== 'connection') {
    return undefined;
  }

  const control = d3.select<any, Control<any>>(event.target.closest('g.control')).datum();
  return {
    id: control.element.id,
    handle: handle.id
  };
}

/**
 * Compute updated bounds by dragging resizeHandle.
 * @param bounds
 * @param handle
 * @param delta
 */
const computeBounds = (bounds: ScreenBounds, handle: Handle, delta: Point): ScreenBounds => {
  let { x, y, width, height } = bounds;

  // Clip direction.
  const { p } = handle;
  const [dx, dy] = [Math.abs(p[0]) * delta[0], Math.abs(p[1]) * delta[1]];

  if (p[0] < 0) {
    width -= dx;
    x += dx;
  } else {
    width += dx;
  }

  if (p[1] < 0) {
    height += dy;
  } else {
    height -= dy;
    y += dy;
  }

  return { x, y, width, height };
};

type DragCallback<T> = (
  handle: T,
  delta: Point,
  mod: Modifiers,
  commit?: boolean,
  connection?: Connection
) => void;

/**
 * Drag handler for resize or control handles.
 * @param scale
 * @param onUpdate
 */
const dragHandle = <T extends any>(scale: Scale, onUpdate: DragCallback<T>): D3Callable => {
  let start: Point;
  let subject: T;

  return d3.drag()
    .container(function () {
      return this.closest('svg'); // Container for d3.pointer.
    })
    .on('start', function (event: D3DragEvent) {
      subject = event.subject;
      start = scale.translate([event.x, event.y]);
    })
    .on('drag', function (event: D3DragEvent) {
      // Stop consuming events (enables hover over other elements while dragging).
      d3.select(this).style('pointer-events', 'none');
      const current = scale.translate([event.x, event.y]);
      const mod = getEventMod(event.sourceEvent);
      onUpdate(subject, [current[0] - start[0], current[1] - start[1]], mod);
    })
    .on('end', function (event: D3DragEvent) {
      // Start consuming events again.
      d3.select(this).style('pointer-events', undefined);
      const connection = getConnection(event.sourceEvent);
      const mod = getEventMod(event.sourceEvent);
      const current = scale.translate([event.x, event.y]);
      const delta: Point = [current[0] - start[0], current[1] - start[1]];
      onUpdate(subject, delta, mod, true, connection);
    });
};

/**
 * Draw the resizable frame.
 */
export const createFrame = (scale: Scale): D3Callable => {
  return (group: D3Selection, control: Control<any>, active?: boolean, resizable?: boolean) => {
    const { x, y, width, height } = control.getBounds();

    const cx = x + width / 2;
    const cy = y + height / 2;

    const container = group
      .selectAll('g')
      .data(['frame-group'])
      .join('g');

    // eslint-disable indent
    // Frame container.
    container
      .selectAll('rect.frame-border')
        .data(active ? ['frame-border'] : [])
        .join('rect')
        .attr('class', 'frame-border')
        .attr('x', x)
        .attr('y', y)
        .attr('width', width)
        .attr('height', height);

    // Resize handles.
    container
      .selectAll('g')
        .data(['frame-resize-handles'])
        .join('g')

      .selectAll('circle.frame-handle')
        .data(resizable ? resizeHandles : [], (handle: Handle) => handle.id)
        .join('circle')
        .attr('class', 'frame-handle')
        .attr('cursor', h => h.cursor)
        .attr('cx', ({ p }) => cx + p[0] * width / 2)
        .attr('cy', ({ p }) => cy - p[1] * height / 2)
        .attr('r', FrameProps.controlRadius)
        .call(dragHandle<Handle>(scale, (handle, delta, mod, commit) => {
          const bounds = computeBounds({ x, y, width, height }, handle, delta);
          const data = control.createFromBounds(bounds, mod, commit);
          if (control.checkBounds(data)) {
            control.onUpdate(data, commit);
          }
        }));
    // eslint-enable indent
  };
};

/**
 * Draw control points (e.g., for line, path).
 */
export const createControlHandles = (scale: Scale): D3Callable => {
  return (group: D3Selection, control: Control<any>, active?: boolean, resizable?: boolean) => {
    const points = active ? control.getControlPoints() : [];

    // eslint-disable indent
    group
      .selectAll('g')
        .data(['control-group'])
        .join('g')

      .selectAll('circle.frame-handle')
        .data(resizable ? points : [])
        .join(enter => {
          return enter
            .append('circle')
            .attr('class', 'frame-handle')
            .call(dragHandle<ControlHandle>(scale, (point, delta, mod, commit, connection) => {
              const data = control.updateControlPoint(point, delta, commit, connection);
              control.onUpdate(data, commit);
            }));
        })
        .attr('cursor', 'move')
        .attr('cx', p => p.point[0])
        .attr('cy', p => p.point[1])
        .attr('r', FrameProps.controlRadius);
    // eslint-enable indent
  };
};

/**
 * Draw line connection points.
 */
export const createConectionPoints = (scale: Scale): D3Callable => {
  return (group: D3Selection, control: Control<any>, active?: boolean) => {
    const bounds = control.getBounds();
    const [cx, cy] = Screen.center(bounds);
    const { width, height } = bounds;

    // eslint-disable indent
    group
      .selectAll('g')
        .data(['connection-group'])
        .join('g')

      .selectAll('circle.connection-handle')
        .data(active ? connectionHandles : [], (handle: Handle) => handle.id)
        .join(enter => {
          return enter
            .append('circle')
            .attr('class', 'connection-handle');
          // TODO(burdon): Support drag from connection point to start line.
          // .call(handleDrag<Handle>((handle, delta, mod, commit) => {
          //   const bounds = computeBounds({ x, y, width, height }, handle, delta);
          //   const data = control.createFromBounds(bounds, mod, commit);
          //   control.onUpdate(data, commit);
          // }));
        })
        .attr('cx', ({ p }) => cx + p[0] * width / 2)
        .attr('cy', ({ p }) => cy - p[1] * height / 2)
        .attr('r', FrameProps.connectionRadius);
    // eslint-enable indent
  };
};

