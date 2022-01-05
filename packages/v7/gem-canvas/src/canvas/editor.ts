//
// Copyright 2020 DXOS.org
//

import { Point, Scale } from '@dxos/gem-x';

import { Tool } from '../components';
import { Cursor, Element } from '../model';

/**
 * Editor state referenced by handlers.
 */
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
    console.log('findElement', point);
    return this._elements.length ? this._elements[0] : undefined;
  }
}
