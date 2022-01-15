//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';

import { Modifiers, ScreenBounds, Point, Scale } from '@dxos/gem-x';

import { D3Callable, D3DragEvent, D3Selection } from '../types';
import { Control, ControlPoint } from './control';
import { getEventMod } from './drag';

// TODO(burdon): Create events util.
// https://developer.mozilla.org/en-US/docs/Web/CSS/pointer-events
// https://developer.mozilla.org/en-US/docs/Web/API/Element/mouseenter_event

const FrameProps = {
  handleRadius: 7
};

type Handle = { id: string, p: Point, cursor: string }

// https://developer.mozilla.org/en-US/docs/Web/CSS/cursor

const handles: Handle[] = [
  { id: 'n-resize', p: [0, 1], cursor: 'ns-resize' },
  { id: 'ne-resize', p: [1, 1], cursor: 'nesw-resize' },
  { id: 'e-resize', p: [1, 0], cursor: 'ew-resize' },
  { id: 'se-resize', p: [1, -1], cursor: 'nwse-resize' },
  { id: 's-resize', p: [0, -1], cursor: 'ns-resize' },
  { id: 'sw-resize', p: [-1, -1], cursor: 'nesw-resize' },
  { id: 'w-resize', p: [-1, 0], cursor: 'ew-resize' },
  { id: 'nw-resize', p: [-1, 1], cursor: 'nwse-resize' }
];

const connectionHandles = handles.filter(({ p: [x, y] }) => Math.abs(x + y) === 1);

/**
 * Compute updated bounds by dragging handles.
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

/**
 * Handle drag handles.
 * @param onUpdate
 */
const handleDrag = <T extends any>(
  onUpdate: (handle: T, delta: Point, mod: Modifiers, commit?: boolean, target?: Control<any>) => void
): D3Callable => {
  let start: Point;
  let subject: T;

  return d3.drag()
    .on('start', function (event: D3DragEvent) {
      subject = event.subject;
      start = [event.x, event.y];
    })
    .on('drag', function (event: D3DragEvent) {
      // Stop consuming events once dragging (enables hover over other elements).
      d3.select(this).style('pointer-events', 'none');

      const mod = getEventMod(event.sourceEvent);
      const current = [event.x, event.y];
      onUpdate(subject, [current[0] - start[0], current[1] - start[1]], mod);
    })
    .on('end', function (event: D3DragEvent) {
      // Consume events again.
      d3.select(this).style('pointer-events', undefined);

      // Get drop target.
      // const handle = d3.select(event.sourceEvent.target).datum();
      const target = d3.select(event.sourceEvent.target.parentNode).datum() as Control<any>;

      const mod = getEventMod(event.sourceEvent);
      const current = [event.x, event.y];
      onUpdate(subject, [current[0] - start[0], current[1] - start[1]], mod, true, target);
    });
};

/**
 * Draw the resizable frame.
 */
export const createFrame = (scale: Scale): D3Callable => {
  return (group: D3Selection, base: Control<any>, active?: boolean, resizable?: boolean) => {
    const { x, y, width, height } = base.getBounds();

    const cx = x + width / 2;
    const cy = y + height / 2;

    // eslint-disable indent
    group.selectAll('rect.frame')
      .data(active ? ['_frame_'] : [])
      .join('rect')
      .attr('class', 'frame')
      .attr('x', x)
      .attr('y', y)
      .attr('width', width)
      .attr('height', height);

    group
      .selectAll('circle.frame-handle')
      .data(resizable ? handles : [], (handle: Handle) => handle.id)
      .join('circle')
      .attr('class', 'frame-handle')
      .attr('cursor', h => h.cursor)
      .attr('cx', ({ p }) => cx + p[0] * width / 2)
      .attr('cy', ({ p }) => cy - p[1] * height / 2)
      .attr('r', FrameProps.handleRadius)
      .call(handleDrag<Handle>((handle, delta, mod, commit) => {
        const bounds = computeBounds({ x, y, width, height }, handle, delta);
        const data = base.createFromBounds(bounds, mod, commit);
        base.onUpdate(data, commit);
      }));
    // eslint-enable indent
  };
};

/**
 * Draw line connection points.
 */
export const createConectionPoints = (scale: Scale): D3Callable => {
  return (group: D3Selection, base: Control<any>, active?: boolean) => {
    const { x, y, width, height } = base.getBounds();
    const cx = x + width / 2;
    const cy = y + height / 2;

    // eslint-disable indent
    group
      .selectAll('circle.connection-handle')
      .data(active ? connectionHandles : [], (handle: Handle) => handle.id)
      .join(enter => {
        return enter
          .append('circle')
          .attr('class', 'connection-handle');
        // TODO(burdon): Support drag from connection point to start line.
        // .call(handleDrag<Handle>((handle, delta, mod, commit) => {
        //   const bounds = computeBounds({ x, y, width, height }, handle, delta);
        //   const data = base.createFromBounds(bounds, mod, commit);
        //   base.onUpdate(data, commit);
        // }));
      })
      .attr('cx', ({ p }) => cx + p[0] * width / 2)
      .attr('cy', ({ p }) => cy - p[1] * height / 2)
      .attr('r', FrameProps.handleRadius);
    // eslint-enable indent
  };
};

/**
 * Draw control points.
 */
export const createControlPoints = (scale: Scale): D3Callable => {
  return (group: D3Selection, base: Control<any>, active?: boolean, resizable?: boolean) => {
    const points = active ? base.getControlPoints() : [];

    // eslint-disable indent
    group
      .selectAll('circle.frame-handle')
      .data(points)
      .join(enter => {
        return enter
          .append('circle')
          .attr('class', 'frame-handle')
          .call(handleDrag<ControlPoint>((point, delta, mod, commit, target) => {
            const data = base.updateControlPoint(point, delta, commit, target);
            base.onUpdate(data, commit);
          }));
      })
      .attr('cursor', 'move')
      .attr('cx', p => p.point[0])
      .attr('cy', p => p.point[1])
      .attr('r', FrameProps.handleRadius);
    // eslint-enable indent
  };
};
