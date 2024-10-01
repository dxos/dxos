//
// Copyright 2024 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import {
  type EditorState,
  type Extension,
  type RangeSet,
  RangeSetBuilder,
  StateEffect,
  StateField,
  type Transaction,
} from '@codemirror/state';
import { Decoration, EditorView, ViewPlugin, WidgetType } from '@codemirror/view';

import { type ComputeNode } from '../graph';

const LANGUAGE_TAG = 'dx';

// TODO(burdon): Create marker just for our decorator?
const updateAllDecorations = StateEffect.define<void>();

export type ComputeOptions = {};

export const compute = (computeNode: ComputeNode, options: ComputeOptions = {}): Extension => {
  const update = (state: EditorState) => {
    const builder = new RangeSetBuilder();
    syntaxTree(state).iterate({
      enter: (node) => {
        if (node.name === 'FencedCode') {
          const cursor = state.selection.main.head;
          if (state.readOnly || cursor < node.from || cursor > node.to) {
            const info = node.node.getChild('CodeInfo');
            if (info) {
              const type = state.sliceDoc(info.from, info.to);
              const text = node.node.getChild('CodeText');
              if (type === LANGUAGE_TAG && text) {
                const content = state.sliceDoc(text.from, text.to);
                // TODO(burdon): Map unique reference onto cell; e.g., track ordered list?
                computeNode.setValue({ col: 0, row: 0 }, content);
                const value = computeNode.getValue({ col: 0, row: 0 });
                builder.add(
                  node.from,
                  node.to,
                  Decoration.replace({
                    widget: new DxWidget(String(value)),
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

  return [
    // Graph subscription.
    ViewPlugin.fromClass(
      class {
        private readonly _subscription: any;
        constructor(view: EditorView) {
          this._subscription = computeNode.graph.update.on(() => {
            view.dispatch({
              effects: updateAllDecorations.of(),
            });
          });
        }

        destroy() {
          this._subscription();
        }
      },
    ),

    // Decorations.
    StateField.define<RangeSet<any>>({
      create: (state) => update(state),
      update: (_: RangeSet<any>, tr: Transaction) => update(tr.state),
      provide: (field) => EditorView.decorations.from(field),
    }),
  ];
};

class DxWidget extends WidgetType {
  constructor(private readonly value: string) {
    super();
  }

  override toDOM(view: EditorView) {
    const div = document.createElement('div');
    div.innerText = this.value;
    return div;
  }
}
