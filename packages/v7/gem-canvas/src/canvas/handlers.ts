//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import type { D3DragEvent } from 'd3';
import faker from 'faker';

import { distance, Point, Scale } from '@dxos/gem-x';

import { Tool } from '../components';
import { createCursor, createElement, Cursor, Element, Path } from '../model';

// TODO(burdon): Remove faker.
const uuid = () => faker.datatype.uuid();

// TODO(burdon): Editor state referenced by handlers.
export class Editor {
  _tool: Tool;
  _cursor: Cursor;
  _selected: Element;
  _elements: Element[];

  constructor (
    private readonly _scale: Scale
  ) {}

  get scale () {
    return this._scale;
  }

  get tool () {
    return this._tool;
  }

  get cursor () {
    return this._cursor;
  }

  get selected () {
    return this._selected;
  }

  get elements () {
    return this._elements;
  }

  setTool (tool: Tool) {
    this._tool = tool;
  }

  setCursor (cursor: Cursor) {
    this._cursor = cursor;
  }

  setSelected (selected: Element) {
    this._selected = selected;
  }

  setElements (elements: Element[]) {
    this._elements = elements;
  }

  // TODO(burdon): Map point to model.
  findElement (point: Point) {
    console.log('find', point);
    return this._elements.length ? this._elements[0] : undefined;
  }
}

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

    .on('start', (event: D3DragEvent<any, any, any>) => {
      if (editor.tool === 'path') { // TODO(burdon): Create filter.
        return;
      }

      start = editor.scale.mapToModel([event.x, event.y], true); // Snap.
    })

    .on('drag', (event: D3DragEvent<any, any, any>) => {
      if (editor.tool === 'path') {
        return;
      }

      // TODO(burdon): Smart snap (i.e., if close to grid line).
      end = editor.scale.mapToModel([event.x, event.y]);

      // TODO(burdon): Update existing.
      const cursor = createCursor('_', editor.tool, start, end);
      setCursor(cursor);
    })

    .on('end', (event: D3DragEvent<any, any, any>) => {
      if (editor.tool === 'path') {
        return;
      }

      end = editor.scale.mapToModel([event.x, event.y], true);
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
      // Select.
      if (!editor.tool) {
        const selected = editor.findElement([event.x, event.y]);
        if (selected && selected.type === 'rect') {
          editor.setSelected(selected);
          setCursor({
            ...selected,
            id: '_'
          });
        }
        return;
      }

      // Path tool.
      if (editor.tool === 'path') {
        const [x, y] = editor.scale.mapToModel([event.x, event.y]);
        if (!editor.cursor) {
          // Create new cursor.
          const cursor = createCursor('_', editor.tool);
          const data = cursor.data as Path;
          data.points.push([x, y]);
          setCursor(cursor);
          return;
        } else {
          const data = editor.cursor.data as Path;
          data.points.push([x, y]);
          return setCursor({ ...editor.cursor });
        }
      }
    })

    // TODO(burdon): Disable zoom/drag.
    // TODO(burdon): Show cross-hair while moving tool.
    .on('mousemove', (event: MouseEvent) => {
      if (editor.tool === 'path') {
        const [x, y] = editor.scale.mapToModel([event.x, event.y]);
        if (editor.cursor) {
          const data = editor.cursor.data as Path;
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
            const data = editor.cursor.data as Path;
            data.type = 'cardinal';
            data.closed = true;
            data.points.splice(data.points.length - 1, 1);

            setCursor(undefined);
            addElement({ ...editor.cursor });
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
