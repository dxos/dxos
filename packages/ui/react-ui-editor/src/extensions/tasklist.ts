//
// Copyright 2023 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { RangeSetBuilder } from '@codemirror/state';
import { EditorView, Decoration, WidgetType, ViewPlugin, type DecorationSet, type ViewUpdate } from '@codemirror/view';

import { getToken } from '../styles';

// TODO(burdon): Reconcile with theme.
const styles = EditorView.baseTheme({
  '& .cm-task': {
    color: getToken('extend.colors.blue.500'),
  },
  '& .cm-task-checkbox': {
    marginLeft: '4px',
    marginRight: '4px',
  },
});

class CheckboxWidget extends WidgetType {
  constructor(private _checked: boolean) {
    super();
  }

  override eq(other: this) {
    return this._checked === other._checked;
  }

  override toDOM(view: EditorView) {
    const input = document.createElement('input');
    input.className = 'cm-task-checkbox';
    input.type = 'checkbox';
    input.checked = this._checked;
    if (view.state.readOnly) {
      input.setAttribute('disabled', 'true');
    } else {
      input.onmousedown = (event: Event) => {
        const pos = view.posAtDOM(input);
        const text = view.state.sliceDoc(pos, pos + 3);
        if (text === (this._checked ? '[x]' : '[ ]')) {
          view.dispatch({
            changes: { from: pos + 1, to: pos + 2, insert: this._checked ? ' ' : 'x' },
          });
          event.preventDefault();
        }
      };
    }

    return input;
  }

  override ignoreEvent() {
    return false;
  }
}

const checkedDecoration = Decoration.replace({ widget: new CheckboxWidget(true) });
const uncheckedDecoration = Decoration.replace({ widget: new CheckboxWidget(false) });

const buildDecorations = (view: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  const { state } = view;
  const cursor = state.selection.main.head;

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      enter: (node) => {
        if (node.name === 'TaskMarker') {
          // Check if cursor is inside text.
          if (cursor < node.from || cursor > node.to) {
            const checked = state.doc.sliceString(node.from + 1, node.to - 1) === 'x';
            builder.add(node.from - 2, node.from - 1, Decoration.mark({ class: 'cm-task' }));
            builder.add(node.from, node.to, checked ? checkedDecoration : uncheckedDecoration);
          }
        }
      },
      from,
      to,
    });
  }

  return builder.finish();
};

export type TasklistOptions = {};

export const tasklist = (options: TasklistOptions = {}) => {
  return [
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
          this.decorations = buildDecorations(view);
        }

        update(update: ViewUpdate) {
          if (update.docChanged || update.viewportChanged || update.selectionSet) {
            this.decorations = buildDecorations(update.view);
          }
        }
      },
      {
        decorations: (v) => v.decorations,
      },
    ),
    styles,
  ];
};
