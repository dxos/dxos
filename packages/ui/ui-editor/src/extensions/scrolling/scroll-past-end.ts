//
// Copyright 2024 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';

/**
 * Custom scroll-past-end extension that accounts for the actual height of the last line.
 * The built-in CodeMirror `scrollPastEnd` uses `defaultLineHeight` which doesn't account
 * for taller elements like headings, block widgets, etc.
 */
const scrollPastEndPlugin = ViewPlugin.fromClass(
  class {
    _height = 1_000;
    _attrs: { style: string } | null = { style: `padding-bottom: ${this._height}px` };

    update({ view }: { view: EditorView }) {
      const lastLineBlock = view.lineBlockAt(view.state.doc.length);
      const height = view.dom.clientHeight - lastLineBlock.height - view.documentPadding.top - 0.5;
      if (height >= 0 && height !== this._height) {
        this._height = height;
        this._attrs = { style: `padding-bottom: ${height}px` };
      }
    }
  },
);

export const scrollPastEnd = (): Extension => [
  scrollPastEndPlugin,
  EditorView.contentAttributes.of((view) => view.plugin(scrollPastEndPlugin)?._attrs ?? null),
];
