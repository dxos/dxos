//
// Copyright 2023 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, type Range, StateField, type Transaction } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';

import { focusField } from '../focus';

export type ImageOptions = {};

/**
 * Create image decorations.
 */
export const image = (_options: ImageOptions = {}): Extension => [
  StateField.define<DecorationSet>({
    create: (state) => Decoration.set(buildDecorations(state, 0, state.doc.length)),
    update: (value: DecorationSet, tr: Transaction) => {
      if (!tr.docChanged && !tr.selection) {
        return value;
      }

      // Find range of changes and cursor changes.
      const cursor = tr.state.selection.main.head;
      const oldCursor = tr.changes.mapPos(tr.startState.selection.main.head);
      let from = Math.min(cursor, oldCursor);
      let to = Math.max(cursor, oldCursor);
      tr.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
        from = Math.min(from, fromB);
        to = Math.max(to, toB);
      });

      // Expand to cover lines.
      from = tr.state.doc.lineAt(from).from;
      to = tr.state.doc.lineAt(to).to;

      return value.map(tr.changes).update({
        filterFrom: from,
        filterTo: to,
        filter: () => false,
        add: buildDecorations(tr.state, from, to),
      });
    },
    provide: (field) => EditorView.decorations.from(field),
  }),
];

const buildDecorations = (state: EditorState, from: number, to: number) => {
  const decorations: Range<Decoration>[] = [];
  const cursor = state.selection.main.head;
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name === 'Image') {
        const urlNode = node.node.getChild('URL');
        if (urlNode) {
          const hide = state.readOnly || cursor < node.from || cursor > node.to || !state.field(focusField);

          const url = state.sliceDoc(urlNode.from, urlNode.to);
          // Some plugins might be using custom URLs; avoid attempts to render those URLs.
          if (url.match(/^https?:\/\//) === null && url.match(/^file?:\/\//) === null) {
            return;
          }

          preloadImage(url);
          decorations.push(
            Decoration.replace({
              block: true, // Prevent cursor from entering.
              widget: new ImageWidget(url),
            }).range(hide ? node.from : node.to, node.to),
          );
        }
      }
    },
    from,
    to,
  });

  return decorations;
};

const preloaded = new Set<string>();

const preloadImage = (url: string) => {
  if (!preloaded.has(url)) {
    const img = document.createElement('img');
    img.src = url;
    preloaded.add(url);
  }
};

class ImageWidget extends WidgetType {
  constructor(readonly _url: string) {
    super();
  }

  override eq(other: this): boolean {
    return this._url === other._url;
  }

  override toDOM(view: EditorView): HTMLImageElement {
    const img = document.createElement('img');
    img.setAttribute('src', this._url);
    img.setAttribute('class', 'cm-image');
    // If focused, hide image until successfully loaded to avoid flickering effects.
    if (view.state.field(focusField)) {
      img.onload = () => img.classList.add('cm-loaded-image');
    } else {
      img.classList.add('cm-loaded-image');
    }

    return img;
  }
}
