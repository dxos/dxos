//
// Copyright 2023 DXOS.org
//

import { syntaxTree } from '@codemirror/language';
import { type EditorState, type RangeSet, RangeSetBuilder, StateField, type Transaction } from '@codemirror/state';
import { EditorView, Decoration, WidgetType } from '@codemirror/view';

class CheckboxWidget extends WidgetType {
  constructor(private readonly _pos: number, private _checked: boolean) {
    super();
  }

  override eq(other: any) {
    return other.pos === this._pos && other.checked === this._checked;
  }

  toDOM(view: EditorView) {
    const wrap = document.createElement('span');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.className = 'cm-task-item';
    const box = wrap.appendChild(document.createElement('input'));
    box.type = 'checkbox';
    box.checked = this._checked;
    box.onclick = () => {
      const text = view.state.sliceDoc(this._pos, this._pos + 3).toLowerCase();
      console.log('click', this._pos, isChecked(view.state, this._pos), text);
      this._checked = !isChecked(view.state, this._pos);
      view.dispatch({
        changes: {
          from: this._pos + 1,
          to: this._pos + 2,
          insert: this._checked ? 'x' : ' ',
        },
        // TODO(burdon): Move cursor to end of line on click.
        selection: {
          anchor: this._pos + 4,
        },
      });
      return true;
    };
    return wrap;
  }

  override ignoreEvent() {
    return false;
  }
}

const isChecked = (state: EditorState, pos: number) => {
  return state.sliceDoc(pos, pos + 3).toLowerCase() === '[x]';
};

export const statefield = () => {
  const checkbox = (state: EditorState) => {
    const builder = new RangeSetBuilder();
    syntaxTree(state).iterate({
      enter: (node) => {
        if (node.name === 'TaskMarker') {
          builder.add(
            node.from,
            node.to,
            Decoration.replace({ widget: new CheckboxWidget(node.from, isChecked(state, node.from)) }),
          );
        }
      },
    });

    return builder.finish();
  };

  return StateField.define<RangeSet<any>>({
    create: (state) => checkbox(state),
    update: (_: RangeSet<any>, tr: Transaction) => checkbox(tr.state),
    provide: (field) => EditorView.decorations.from(field),
  });
};

// TODO(burdon): Reconcile with theme.
export const styles = EditorView.baseTheme({
  '& .cm-task-item': {
    padding: '0 4px',
  },
});

export const tasklist = () => [statefield(), styles];
