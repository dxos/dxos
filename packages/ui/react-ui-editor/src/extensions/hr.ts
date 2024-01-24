//
// Copyright 2023 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from '@codemirror/view';

import { getToken } from '../styles';

// TODO(burdon): Reconcile with theme.
const styles = EditorView.baseTheme({
  '& .cm-hr': {
    // Note that block-level decorations should not have vertical margins,
    borderTop: `1px solid ${getToken('extend.colors.neutral.200')}`,
  },
});

class HorizontalRuleWidget extends WidgetType {
  override toDOM() {
    const el = document.createElement('div');
    el.className = 'cm-hr';
    return el;
  }
}

const decoration = Decoration.replace({ widget: new HorizontalRuleWidget() });

const buildDecorations = (view: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  const { state } = view;
  const cursor = state.selection.main.head;

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      enter: (node) => {
        if (node.name === 'HorizontalRule') {
          // Check if cursor is inside text.
          if (cursor <= node.from || cursor >= node.to) {
            builder.add(node.from, node.to, decoration);
          }
        }
      },
      from,
      to,
    });
  }

  return builder.finish();
};

export const hr = () => {
  return [
    styles,
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
          this.decorations = buildDecorations(view);
        }

        update(update: ViewUpdate) {
          this.decorations = buildDecorations(update.view);
        }
      },
      {
        decorations: (v) => v.decorations,
      },
    ),
  ];
};
