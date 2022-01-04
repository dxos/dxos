//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import type { D3DragEvent } from 'd3';
import faker from 'faker';

import { createElement, Element, Path } from '../model';
import { distance, Point, Scale } from '../scale';

// TODO(burdon): Remove faker.
const uuid = () => faker.datatype.uuid();

/**
 *
 * @param scale
 * @param toolRef
 * @param cursorRef
 * @param setCursor
 * @param addElement
 */
export const createMouseHandlers = (
  scale: Scale,
  toolRef,
  cursorRef,
  setCursor: (element: Element) => void,
  addElement: (element: Element) => void
) => {
  let start: Point;
  let end: Point;

  //
  // Drag
  //
  const dragHandler = d3.drag()
    // Filter unless tool selected (since clashes with zoom).
    .filter(() => {
      return Boolean(toolRef.current);
    })

    .on('start', (event: D3DragEvent<any, any, any>) => {
      if (toolRef.current === 'path') {
        return;
      }

      // TODO(burdon): Snap.
      start = scale.mapToModel([event.x, event.y], true);
    })

    .on('drag', (event: D3DragEvent<any, any, any>) => {
      if (toolRef.current === 'path') {
        return;
      }

      end = scale.mapToModel([event.x, event.y]);

      // TODO(burdon): Update existing?
      const element = createElement('_', toolRef.current, start, end);
      setCursor(element);
    })

    .on('end', (event: D3DragEvent<any, any, any>) => {
      if (toolRef.current === 'path') {
        return;
      }

      end = scale.mapToModel([event.x, event.y], true);
      setCursor(undefined);

      // Check non-zero size.
      // TODO(burdon): Depends on zoom.
      const d = distance(start, end);
      if (d === 0) {
        return;
      }

      const element = createElement(uuid(), toolRef.current, start, end);
      if (element) {
        addElement(element);
      }
    });

  //
  // Mouse
  // https://github.com/d3/d3-selection#handling-events
  //
  const mouseHandler = element => element
    .on('click', (event: MouseEvent) => {
      if (toolRef.current === 'path') {
        const [x, y] = scale.mapToModel([event.x, event.y]);
        if (!cursorRef.current) {
          const cursor = createElement(uuid(), toolRef.current);
          const data = cursor.data as Path;
          data.points.push([x, y]);
          setCursor(cursor);
        } else {
          const data = cursorRef.current.data as Path;
          data.points.push([x, y]);
          return setCursor({ ...cursorRef.current });
        }
      }
    })

    // TODO(burdon): Disable zoom/drag.
    .on('mousemove', (event: MouseEvent) => {
      if (toolRef.current === 'path') {
        const [x, y] = scale.mapToModel([event.x, event.y]);
        if (cursorRef.current) {
          const data = cursorRef.current.data as Path;
          const points = data.points;
          if (points.length === 1) {
            points.push([x, y]);
          } else {
            points.splice(points.length - 1, 1, [x, y]);
          }

          setCursor({ ...cursorRef.current });
        }
      }
    });

  return el => el
    .call(dragHandler)
    .call(mouseHandler);
};

/**
 *
 * @param scale
 * @param toolRef
 * @param cursorRef
 * @param setCursor
 * @param addElement
 */
export const createKeyHandlers = (
  scale: Scale,
  toolRef,
  cursorRef,
  setCursor: (element: Element) => void,
  addElement: (element: Element) => void
) => {
  return element => element
    .on('keydown', (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Enter': {
          if (toolRef.current === 'path') {
            const data = cursorRef.current.data as Path;
            data.type = 'cardinal';
            data.closed = true;
            data.points.splice(data.points.length - 1, 1);

            setCursor(undefined);
            addElement({ ...cursorRef.current });
          }
          break;
        }

        case 'Escape': {
          setCursor(undefined);
          break;
        }
      }
    });
};
