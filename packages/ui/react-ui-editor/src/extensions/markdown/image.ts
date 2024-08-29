//
// Copyright 2023 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type Extension, StateField, type Transaction, type Range } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';

export type ImageOptions = {};

export const image = (options: ImageOptions = {}): Extension => {
  return StateField.define<DecorationSet>({
    create: (state) => {
      return Decoration.set(buildDecorations(0, state.doc.length, state));
    },
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
        add: buildDecorations(from, to, tr.state),
      });
    },
    provide: (field) => EditorView.decorations.from(field),
  });
};

const preloaded = new Set<string>();

const preloadImage = (url: string) => {
  if (!preloaded.has(url)) {
    const img = document.createElement('img');
    img.src = url;
    preloaded.add(url);
  }
};

const buildDecorations = (from: number, to: number, state: EditorState) => {
  const decorations: Range<Decoration>[] = [];
  const cursor = state.selection.main.head;

  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name === 'Image') {
        const urlNode = node.node.getChild('URL');
        if (urlNode) {
          const hide = state.readOnly || cursor < node.from || cursor > node.to;
          const url = state.sliceDoc(urlNode.from, urlNode.to);
          // TODO(burdon): Doesn't load if scrolling with mouse.
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

class ImageWidget extends WidgetType {
  constructor(readonly _url: string) {
    super();
  }

  override eq(other: this) {
    return this._url === (other as any as ImageWidget)._url;
  }

  override toDOM(view: EditorView) {
    const img = document.createElement('img');
    img.setAttribute('src', this._url);
    img.setAttribute('class', 'cm-image');
    // Images are hidden until successfully loaded to avoid flickering effects.
    img.onload = () => img.classList.add('cm-loaded-image');
    return img;
  }
}

export type ImageUploadOptions = {
  onSelect: () => { url: string };
};

export const imageUpload = (options: ImageOptions = {}) => {};
