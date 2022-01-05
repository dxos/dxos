//
// Copyright 2020 DXOS.org
//

import { Scale } from '@dxos/gem-x';

import { Tool } from '../components';
import { Cursor, Element } from '../model';

/**
 * Editor state referenced by handlers.
 */
export class Editor {
  _tool?: Tool;
  _cursor?: Cursor;
  _elements: Element[];
  _selected?: Element;

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

  get elements () {
    return this._elements ?? [];
  }

  get selected () {
    return this._selected;
  }

  setTool (tool: Tool) {
    this._tool = tool;
  }

  setCursor (cursor: Cursor) {
    this._cursor = cursor;
  }

  setElements (elements: Element[]) {
    this._elements = elements;
  }

  setSelected (selected: Element) {
    this._selected = selected;
  }
}
