//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import faker from 'faker';

import { distance, Point, Scale } from '@dxos/gem-x';

import { createCursor, createElement, moveElement, Element } from '../model';
import { D3DragEvent } from '../types';
import { Editor } from './editor';

// TODO(burdon): Remove faker (move to Editor).
const uuid = () => faker.datatype.uuid();

/**
 * Drag and mouse event handler.
 * @param editor
 * @param scale
 * @param findElement
 */
export const createMouseHandlers = (
  editor: Editor,
  scale: Scale,
  findElement: (point: Point) => Element
) => {
  let start: Point;

  //
  // Tool drag.
  // Coordinate with zoom drag in SvgContainer.
  // https://github.com/d3/d3-drag#drag
  // https://observablehq.com/@d3/click-vs-drag
  //
  const dragHandler = d3.drag()
    // Enable drag if tool selected, actively editing (cursor), or hovering (about to drag).
    .filter(() => {
      return !editor.cursor && Boolean(editor.tool);
    })

    //
    // Drag start
    //
    .on('start', (event: D3DragEvent) => {
      if (editor.tool === 'path') {
        return;
      }

      start = scale.mapPointToModel([event.x, event.y], true); // Snap.
    })

    //
    // Drag move
    //
    .on('drag', (event: D3DragEvent) => {
      if (editor.tool === 'path') {
        return;
      }

      // TODO(burdon): Smart snap (i.e., if close to grid line).
      const current = scale.mapPointToModel([event.x, event.y]);

      // Create.
      if (editor.tool) {
        const cursor = createCursor(undefined, start, current);
        editor.setCursor(cursor);
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

      const current = scale.mapPointToModel([event.x, event.y], true);

      if (editor.cursor.element) {
        // Drag.
        // TODO(burdon): Element is stale after resize.
        const delta: Point = [current[0] - start[0], current[1] - start[1]];
        const element = moveElement(editor.cursor.element, delta);
        editor.updateElement(element);
      } else {
        // Create.
        // TODO(burdon): Min size depends on zoom.
        const d = distance(start, current);
        if (d >= 1) {
          const element = createElement(uuid(), editor.tool, start, current);
          editor.addElement(element);
        }
      }

      editor.setCursor(undefined);
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
        const [x, y] = scale.mapPointToModel([event.x, event.y]);
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
          editor.setCursor(createCursor(selected));
          editor.setSelected(selected);
          return;
        }
      }

      editor.setCursor(undefined);
      editor.setSelected(undefined);
    })

    // TODO(burdon): Disable zoom/drag while tool selected.
    // TODO(burdon): Show cross-hair while moving tool.
    .on('mousemove', (event: MouseEvent) => {
      if (editor.tool === 'path') {
        /*
        const [x, y] = scale.mapPointToModel([event.x, event.y]);
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

      }
    });

  return el => el
    .call(dragHandler)
    .call(mouseHandler);
};

/**
 * Keyboard event handler.
 * @param editor
 */
export const createKeyHandlers = (
  editor: Editor
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
            editor.deleteElement(editor.selected.id);
          }
          break;
        }

        case 'Escape': {
          editor.setCursor(undefined);
          break;
        }
      }
    });
};
