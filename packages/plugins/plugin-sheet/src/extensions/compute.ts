//
// Copyright 2024 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { Facet } from '@codemirror/state';
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

import { type UnsubscribeCallback } from '@dxos/async';

import type { CellAddress } from '../defs';
import { type ComputeNode } from '../graph';
import { type CellScalarValue } from '../types';

// TODO(burdon): Make generic; compute from object/space facet?
export const computeNodeFacet = Facet.define<ComputeNode, ComputeNode>({
  combine: (values) => values[0],
});

const LANGUAGE_TAG = 'dx';

// TODO(burdon): Create marker just for our decorator?
const updateAllDecorations = StateEffect.define<void>();

export type ComputeOptions = {};

export const compute = (options: ComputeOptions = {}): Extension => {
  const update = (state: EditorState, rangeSet?: RangeSet<Decoration>) => {
    const builder = new RangeSetBuilder<Decoration>();
    const computeNode = state.facet(computeNodeFacet);
    if (computeNode) {
      computeNode.clear();
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
                  const formula = state.sliceDoc(text.from, text.to);
                  const iter = rangeSet?.iter(node.node.from);
                  if (iter?.value && iter?.value.spec.formula === formula) {
                    builder.add(node.from, node.to, iter.value);
                  } else {
                    const cell: CellAddress = { col: node.node.from, row: 0 };
                    computeNode.setValue(cell, formula);
                    const value = computeNode.getValue(cell);
                    builder.add(
                      node.from,
                      node.to,
                      Decoration.replace({
                        widget: new DxWidget(formula, value),
                        formula,
                      }),
                    );
                  }
                }
              }
            }
          }
        },
      });
    }

    return builder.finish();
  };

  return [
    // Graph subscription.
    ViewPlugin.fromClass(
      class {
        private readonly _subscription?: UnsubscribeCallback;
        constructor(view: EditorView) {
          const computeNode = view.state.facet(computeNodeFacet);
          if (computeNode) {
            this._subscription = computeNode.graph.update.on(() => {
              console.log('updated'); // TODO(burdon): Get update from graph.
              view.dispatch({
                effects: updateAllDecorations.of(),
              });
            });
          }
        }

        destroy() {
          this._subscription?.();
        }
      },
    ),

    StateField.define<RangeSet<Decoration>>({
      create: (state) => update(state),
      update: (rangeSet: RangeSet<Decoration>, tr: Transaction) => update(tr.state, rangeSet),
      provide: (field) => EditorView.decorations.from(field),
    }),
  ];
};

class DxWidget extends WidgetType {
  constructor(
    private readonly formula: string,
    private readonly value: CellScalarValue,
  ) {
    super();
  }

  override toDOM(_view: EditorView) {
    const div = document.createElement('div');
    div.setAttribute('title', this.formula);
    div.innerText = String(this.value);
    return div;
  }
}
