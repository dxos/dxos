//
// Copyright 2024 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import {
  type EditorState,
  type Extension,
  type RangeSet,
  type Transaction,
  RangeSetBuilder,
  StateField,
} from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';

export type MermaidOptions = {};

// TODO(burdon): Move to mermaid-plugin (which should contribute this extension).
export const mermaid = (options: MermaidOptions = {}): Extension => {
  return [
    StateField.define<RangeSet<any>>({
      create: (state) => update(state, options),
      update: (_: RangeSet<any>, tr: Transaction) => update(tr.state, options),
      provide: (field) => EditorView.decorations.from(field),
    }),
  ];
};

const update = (state: EditorState, options: MermaidOptions) => {
  const builder = new RangeSetBuilder();
  const cursor = state.selection.main.head;

  syntaxTree(state).iterate({
    enter: (node) => {
      if (node.name === 'FencedCode') {
        if (state.readOnly || cursor < node.from || cursor > node.to) {
          const info = node.node.getChild('CodeInfo');
          if (info) {
            const type = state.sliceDoc(info.from, info.to);
            const text = node.node.getChild('CodeText');
            if (type === 'mermaid' && text) {
              const content = state.sliceDoc(text.from, text.to);
              builder.add(
                node.from,
                node.to,
                Decoration.replace({
                  block: true,
                  widget: new MermaidWidget(content),
                }),
              );
            }
          }
        }
      }
    },
  });

  return builder.finish();
};

class MermaidWidget extends WidgetType {
  constructor(private readonly _text: string) {
    super();
  }

  override eq(other: MermaidWidget) {
    return this._text === other._text;
  }

  // TODO(burdon): Render.
  toDOM(view: EditorView) {
    const el = document.createElement('pre');
    el.innerText = this._text;
    return el;
  }
}
