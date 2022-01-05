//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import faker from 'faker';

import { distance, Point } from '@dxos/gem-x';

import { createCursor, createElement, moveElement, Cursor, Element } from '../model';
import { D3DragEvent } from '../types';
import { Editor } from './editor';

// TODO(burdon): Remove faker.
const uuid = () => faker.datatype.uuid();

/**
 * Drag and mouse event handler.
 * @param editor
 * @param setCursor
 * @param onCreate
 * @param onUpdate
 * @param findElement
 */
export const createMouseHandlers = (
  editor: Editor,
  setCursor: (cursor: Cursor) => void,
  onCreate: (element: Element) => void,
  onUpdate: (element: Element) => void,
  findElement: (point: Point) => Element
) => {
  let start: Point;
  let hover: Element;

  // TODO(burdon): Is tool the same as element.type? (Or should tool type have an element type property).
  // TODO(burdon): Remove special case for Path tool.

  //
  // Tool drag.
  // Coordinate with zoom drag in SvgContainer.
  // https://github.com/d3/d3-drag#drag
  // https://observablehq.com/@d3/click-vs-drag
  //
  const dragHandler = d3.drag()
    // Enable drag if tool selected, actively editing (cursor), or hovering (about to drag).
    .filter(() => {
      return Boolean(editor.tool) || Boolean(editor.cursor) || Boolean(hover);
    })

    //
    // Drag start
    //
    .on('start', (event: D3DragEvent) => {
      if (editor.tool === 'path') {
        return;
      }

      start = editor.scale.mapPointToModel([event.x, event.y], true); // Snap.
    })

    //
    // Drag move
    //
    .on('drag', (event: D3DragEvent) => {
      if (editor.tool === 'path') {
        return;
      }

      // TODO(burdon): Smart snap (i.e., if close to grid line).
      const current = editor.scale.mapPointToModel([event.x, event.y]);

      // TODO(burdon): Normalize: define cursor modes.
      // 1. Create new element (inital drag using tool with no cursor).
      // 2. Drag of existing cursor to move.
      // 2. Resize of existing cursor (using draw.ts drag).

      // Create.
      if (editor.tool) {
        const cursor = createCursor(undefined, start, current);
        setCursor(cursor);
      } else {
        // Drag.
        if (hover) {
          const cursor = createCursor(hover, start, current);
          setCursor(cursor);
        }
      }
    })

    //
    // Drag end
    //
    .on('end', (event: D3DragEvent) => {
      if (!editor.cursor) {
        return;
      }
      if (editor.tool === 'path') {
        return;
      }

      const current = editor.scale.mapPointToModel([event.x, event.y], true);

      if (editor.cursor.element) {
        // Update.
        // TODO(burdon): Element is stale after resize.
        const delta: Point = [current[0] - start[0], current[1] - start[1]];
        const element = moveElement(editor.cursor.element, delta);
        onUpdate(element);
      } else {
        // Create.
        // TODO(burdon): Min size depends on zoom.
        const d = distance(start, current);
        if (d >= 1) {
          const element = createElement(uuid(), editor.tool, start, current);
          onCreate(element);
        }
      }

      setCursor(undefined);
    });

  //
  // Mouse events
  // https://github.com/d3/d3-selection#handling-events
  //
  const mouseHandler = selection => selection
    .on('click', (event: MouseEvent) => {
      // Path tool.
      if (editor.tool === 'path') {
        /*
        const [x, y] = editor.scale.mapPointToModel([event.x, event.y]);
        if (!editor.cursor) {
          const cursor = createCursor(undefined, editor.tool);
          const data = cursor.element.data as Path;
          data.points.push([x, y]);
          setCursor(cursor);
        } else {
          const data = editor.cursor.element.data as Path;
          data.points.push([x, y]);
          setCursor({ ...editor.cursor });
        }
        */
        return;
      }

      // Select.
      const selected = findElement([event.x, event.y]);
      if (selected) {
        // TODO(burdon): Select non-rectangle elements.
        if (selected.type === 'rect') {
          setCursor(createCursor(selected));
          editor.setSelected(selected);
          return;
        }
      }

      setCursor(undefined);
      editor.setSelected(undefined);
    })

    // TODO(burdon): Disable zoom/drag while tool selected.
    // TODO(burdon): Show cross-hair while moving tool.
    .on('mousemove', (event: MouseEvent) => {
      if (editor.tool === 'path') {
        /*
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
        */

        return;
      }

      hover = findElement([event.x, event.y]);
    });

  return el => el
    .call(dragHandler)
    .call(mouseHandler);
};

/**
 * Keyboard event handler.
 * @param editor
 * @param setCursor
 * @param onCreate
 * @param onDelete
 */
export const createKeyHandlers = (
  editor: Editor,
  setCursor: (cursor: Cursor) => void,
  onCreate: (element: Element) => void,
  onDelete: (element: Element) => void
) => {
  return selection => selection
    .on('keydown', (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Enter': {
          if (editor.tool === 'path') {
            /*
            const data = editor.cursor.element.data as Path;
            data.type = 'cardinal';
            data.closed = true;
            data.points.splice(data.points.length - 1, 1);

            onCreate({ ...editor.cursor.element, id: uuid() });
            setCursor(undefined);
            */
          }
          break;
        }

        case 'Backspace': {
          if (editor.selected) {
            onDelete(editor.selected);
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
