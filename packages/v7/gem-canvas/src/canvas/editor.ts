//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { EventEmitter } from '@dxos/gem-x';

import { Tool } from '../components';
import { Cursor, Element } from '../model';

/**
 * Editor state referenced by handlers.
 */
export class Editor {
  readonly updateCursor = new EventEmitter<Cursor>();
  readonly updateElements = new EventEmitter<Element[]>();

  _tool?: Tool;
  _cursor?: Cursor; // TODO(burdon): Manage cursor object.
  _selected?: Element;
  _elements: Element[] = [];

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
    this.updateCursor.emit(this._cursor);
  }

  setSelected (selected: Element) {
    this._selected = selected;
  }

  setElements (elements: Element[]) {
    this._elements = elements ?? [];
    this.updateElements.emit(this._elements);
  }

  addElement (element: Element) {
    this._elements.push(element);
    this.updateElements.emit(this._elements);
  }

  updateElement (element: Element) {
    this._elements = [...this._elements.filter(({ id }) => id !== element.id), element];
    this.updateElements.emit(this._elements);
  }

  deleteElement (id: string) {
    this._elements = this._elements.filter(element => element.id !== id);
    this.updateElements.emit(this._elements);
    this.setCursor(undefined);
  }
}

// TODO(burdon): Factor out hooks.

export const useCursor = (editor: Editor) => {
  const [cursor, setCursor] = useState<Cursor>(editor.cursor);
  useEffect(() => {
    const { off } = editor.updateCursor.on(cursor => {
      setCursor(cursor);
    });

    return off;
  }, []);

  return cursor;
};

export const useElements = (editor: Editor) => {
  const [elements, setElements] = useState<Element[]>(editor.elements);
  useEffect(() => {
    const { off } = editor.updateElements.on(elements => {
      setElements(elements);
    });

    return off;
  }, []);

  return elements;
};
