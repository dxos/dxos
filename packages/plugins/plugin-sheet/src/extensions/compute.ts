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

import { type CleanupFn, debounce } from '@dxos/async';
import {
  type CellAddress,
  type CellScalarValue,
  type ComputeGraph,
  type ComputeNode,
  createSheetName,
} from '@dxos/compute';
import { invariant } from '@dxos/invariant';
import { documentId, singleValueFacet } from '@dxos/ui-editor';

const LANGUAGE_TAG = 'dx';

// TODO(burdon): Create marker just for our decorator?
const updateAllDecorations = StateEffect.define<void>();

export const computeGraphFacet = singleValueFacet<ComputeGraph>();

export type ComputeOptions = {};

export const compute = (_options: ComputeOptions = {}): Extension => {
  let computeNode: ComputeNode | undefined;

  const update = (state: EditorState, current?: RangeSet<Decoration>) => {
    const builder = new RangeSetBuilder<Decoration>();
    if (computeNode) {
      computeNode.clear();
      syntaxTree(state).iterate({
        enter: (node) => {
          switch (node.name) {
            case 'FencedCode': {
              const cursor = state.selection.main.head;
              if (state.readOnly || cursor < node.from || cursor > node.to) {
                const info = node.node.getChild('CodeInfo');
                if (info) {
                  const type = state.sliceDoc(info.from, info.to);
                  const text = node.node.getChild('CodeText');
                  if (type === LANGUAGE_TAG && text) {
                    const formula = state.sliceDoc(text.from, text.to);
                    const iter = current?.iter(node.node.from);
                    if (iter?.value && iter?.value.spec.formula === formula) {
                      // Add existing widget.
                      builder.add(node.from, node.to, iter.value);
                    } else {
                      // TODO(burdon): Create ordered list of cells on each decoration run.
                      const cell: CellAddress = { col: node.node.from, row: 0 };
                      invariant(computeNode);
                      // NOTE: This triggers re-render (below).
                      computeNode.setValue(cell, formula);
                      const value = computeNode.getValue(cell);
                      builder.add(
                        node.from,
                        node.to,
                        Decoration.replace({
                          widget: new ComputeWidget(formula, value),
                          formula,
                        }),
                      );
                    }
                  }
                }
              }

              break;
            }
          }
        },
      });
    }

    return builder.finish();
  };

  return [
    ViewPlugin.fromClass(
      class {
        // Graph subscription.
        private _subscription?: CleanupFn;
        constructor(view: EditorView) {
          const id = view.state.facet(documentId);
          const computeGraph = view.state.facet(computeGraphFacet);
          if (id && computeGraph) {
            queueMicrotask(async () => {
              computeNode = computeGraph.getOrCreateNode(createSheetName({ type: '', id }));
              await computeNode.open();

              // Trigger re-render if values updated.
              // TODO(burdon): Trigger only if formula value updated (currently triggered during render).
              this._subscription = computeNode.update.on(
                debounce(({ type, ...rest }) => {
                  if (type === 'valuesUpdated') {
                    view.dispatch({
                      effects: updateAllDecorations.of(),
                    });
                  }
                }, 250),
              );
            });
          }
        }

        destroy() {
          this._subscription?.();
          void computeNode?.close();
          computeNode = undefined;
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

// TODO(burdon): Click to edit.
class ComputeWidget extends WidgetType {
  constructor(
    private readonly formula: string,
    private readonly value: CellScalarValue,
  ) {
    super();
  }

  override toDOM(_view: EditorView): HTMLDivElement {
    const div = document.createElement('div');
    div.setAttribute('title', this.formula);
    div.innerText = String(this.value);
    return div;
  }
}
