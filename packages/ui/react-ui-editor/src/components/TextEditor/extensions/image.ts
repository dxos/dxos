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
import { Decoration, EditorView, WidgetType } from '@codemirror/view';

export type ImageOptions = {};

export const image = (options: ImageOptions = {}): Extension => {
  return StateField.define<RangeSet<any>>({
    create: (state) => update(state, options),
    update: (_: RangeSet<any>, tr: Transaction) => update(tr.state, options),
    provide: (field) => EditorView.decorations.from(field),
  });
};

const update = (state: EditorState, options: ImageOptions) => {
  const builder = new RangeSetBuilder();
  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name === 'Image') {
        const urlNode = node.node.getChild('URL');
        if (urlNode) {
          const url = state.sliceDoc(urlNode.from, urlNode.to);
          builder.add(
            node.from,
            node.to,
            Decoration.replace({
              widget: new ImageWidget(url),
            }),
          );
        }
      }
    },
  });
  return builder.finish();
};

class ImageWidget extends WidgetType {
  constructor(readonly _url: string) {
    super();
  }

  override eq(other: WidgetType) {
    return this._url === (other as any as ImageWidget)?._url;
  }

  toDOM(view: EditorView) {
    const img = document.createElement('img');
    img.setAttribute('src', this._url);
    return img;
  }
}
