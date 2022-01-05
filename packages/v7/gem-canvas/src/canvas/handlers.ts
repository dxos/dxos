//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import faker from 'faker';

import { distance, Point } from '@dxos/gem-x';

import { createCursor, createElement, Cursor, Element, Path } from '../model';
import { D3DragEvent } from '../types';
import { Editor } from './editor';

// TODO(burdon): Remove faker.
const uuid = () => faker.datatype.uuid();

/**
 *
 * @param editor
 * @param setCursor
 * @param addElement
 */
export const createMouseHandlers = (
  editor: Editor,
  setCursor: (cursor: Cursor) => void,
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
      return Boolean(editor.tool);
    })

    .on('start', (event: D3DragEvent) => {
      if (editor.tool === 'path') { // TODO(burdon): Create filter.
        return;
      }

      start = editor.scale.mapPointToModel([event.x, event.y], true); // Snap.
    })

    .on('drag', (event: D3DragEvent) => {
      if (editor.tool === 'path') {
        return;
      }

      // TODO(burdon): Smart snap (i.e., if close to grid line).
      end = editor.scale.mapPointToModel([event.x, event.y]);

      // TODO(burdon): Update existing.
      const cursor = createCursor(undefined, editor.tool, start, end);
      setCursor(cursor);
    })

    .on('end', (event: D3DragEvent) => {
      if (editor.tool === 'path') {
        return;
      }

      end = editor.scale.mapPointToModel([event.x, event.y], true);
      setCursor(undefined);

      // Check non-zero size.
      // TODO(burdon): Depends on zoom.
      const d = distance(start, end);
      if (d === 0) {
        return;
      }

      const element = createElement(uuid(), editor.tool, start, end);
      if (element) {
        addElement(element);
      }
    });

  //
  // Mouse
  // https://github.com/d3/d3-selection#handling-events
  //
  const mouseHandler = selection => selection
    .on('click', (event: MouseEvent) => {
      // Path tool.
      if (editor.tool === 'path') {
        const [x, y] = editor.scale.mapPointToModel([event.x, event.y]);
        if (!editor.cursor) {
          const cursor = createCursor(undefined, editor.tool);
          const data = cursor.element.data as Path;
          data.points.push([x, y]);
          setCursor(cursor);
        } else {
          const data = editor.cursor.element.data as Path;
          data.points.push([x, y]);
          return setCursor({ ...editor.cursor });
        }
      }

      // Select.
      const selected = editor.findElement([event.x, event.y]);
      if (selected && selected.type === 'rect') {
        editor.setSelected(selected);
        setCursor(createCursor(selected));
      }
    })

    // TODO(burdon): Disable zoom/drag.
    // TODO(burdon): Show cross-hair while moving tool.
    .on('mousemove', (event: MouseEvent) => {
      if (editor.tool === 'path') {
        const [x, y] = editor.scale.mapPointToModel([event.x, event.y]);
        if (editor.cursor) {
          const data = editor.cursor.element.data as Path;
          const points = data.points;
          if (points.length === 1) {
            points.push([x, y]);
          } else {
            points.splice(points.length - 1, 1, [x, y]);
          }

          setCursor({ ...editor.cursor });
        }
      }
    });

  return el => el
    .call(dragHandler)
    .call(mouseHandler);
};

/**
 *
 * @param editor
 * @param setCursor
 * @param addElement
 */
export const createKeyHandlers = (
  editor: Editor,
  setCursor: (cursor: Cursor) => void,
  addElement: (element: Element) => void
) => {
  return selection => selection
    .on('keydown', (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Enter': {
          if (editor.tool === 'path') {
            const data = editor.cursor.element.data as Path;
            data.type = 'cardinal';
            data.closed = true;
            data.points.splice(data.points.length - 1, 1);

            setCursor(undefined);
            addElement({ ...editor.cursor.element });
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
