//
// Copyright 2023 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import {
  type EditorState,
  type Extension,
  type RangeSet,
  RangeSetBuilder,
  StateField,
  type Transaction,
} from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';

export type LinkOptions = {
  onRenderPreview: (el: HTMLElement, url: string, text: string) => void;
};

/**
 * Create image decorations.
 */
export const preview = (options: LinkOptions): Extension => {
  return [
    StateField.define<DecorationSet>({
      create: (state) => buildDecorations(state, options),
      update: (_: RangeSet<Decoration>, tr: Transaction) => buildDecorations(tr.state, options),
      // TODO(burdon): Make atomic.
      provide: (field) => EditorView.decorations.from(field),
    }),
  ];
};

// TODO(burdon): Make atomic.
const buildDecorations = (state: EditorState, options: LinkOptions) => {
  const builder = new RangeSetBuilder<Decoration>();
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name === 'Link') {
        const urlNode = node.node.getChild('URL');
        if (urlNode) {
          const text = state.sliceDoc(node.from + 1, urlNode.from - 2);
          const url = state.sliceDoc(urlNode.from, urlNode.to);
          builder.add(
            node.from,
            node.to,
            Decoration.replace({
              block: true, // Prevent cursor from entering.
              widget: new PreviewWidget(options.onRenderPreview, url, text),
            }),
          );
        }
      }
    },
  });

  return builder.finish();
};

class PreviewWidget extends WidgetType {
  constructor(
    readonly _onRenderPreview: (el: HTMLElement, url: string, text: string) => void,
    readonly _url: string,
    readonly _text: string,
  ) {
    super();
  }

  override eq(other: this) {
    return this._url === (other as any as PreviewWidget)._url;
  }

  override toDOM(view: EditorView) {
    const root = document.createElement('div');
    root.classList.add('cm-preview');
    this._onRenderPreview(root, this._url, this._text);
    return root;
  }
}
