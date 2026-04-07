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
    height = 1000;
    attrs: { style: string } | null = { style: 'padding-bottom: 1000px' };

    update({ view }: { view: EditorView }) {
      const lastLineBlock = view.lineBlockAt(view.state.doc.length);
      const height = view.dom.clientHeight - lastLineBlock.height - view.documentPadding.top - 0.5;
      if (height >= 0 && height !== this.height) {
        this.height = height;
        this.attrs = { style: `padding-bottom: ${height}px` };
      }
    }
  },
);

export const scrollPastEnd = (): Extension => [
  scrollPastEndPlugin,
  EditorView.contentAttributes.of((view) => view.plugin(scrollPastEndPlugin)?.attrs ?? null),
];
