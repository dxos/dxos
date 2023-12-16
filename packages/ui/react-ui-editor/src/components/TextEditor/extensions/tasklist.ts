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
import { EditorView, Decoration, WidgetType } from '@codemirror/view';

class CheckboxWidget extends WidgetType {
  constructor(private readonly _pos: number, private readonly _getCursor: () => number, private _checked: boolean) {
    super();
  }

  override eq(other: CheckboxWidget) {
    // Uniqueness based on position; also checks state.
    // TODO(burdon): Is this efficient? Check life-cycle.
    return this._pos === other._pos && this._checked === other._checked;
  }

  toDOM(view: EditorView) {
    // console.log('toDom', this._pos);
    const wrap = document.createElement('span');
    wrap.setAttribute('aria-hidden', 'true');
    wrap.className = 'cm-task-item';

    const box = wrap.appendChild(document.createElement('input'));
    box.type = 'checkbox';
    box.checked = this._checked;
    box.onclick = (event) => {
      this._checked = !isChecked(view.state, this._pos);
      view.dispatch({
        changes: {
          from: this._pos + 1,
          to: this._pos + 2,
          insert: this._checked ? 'x' : ' ',
        },
        // TODO(burdon): Restore cursor position? More useful to move to end of line (can indent).
        selection: {
          anchor: this._pos + 4,
          // anchor: this._getCursor(),
        },
      });
      return true;
    };

    return wrap;
  }

  // TODO(burdon): Remove listener?
  // override destroy() {
  // console.log('destroy', this._pos);
  // }

  override ignoreEvent() {
    return false;
  }
}

const isChecked = (state: EditorState, pos: number) => {
  return state.sliceDoc(pos, pos + 3).toLowerCase() === '[x]';
};

export const statefield = (): Extension => {
  let lastPosition: number = 0;
  const listener = EditorView.updateListener.of((update) => {
    lastPosition = update.startState.selection.main.head;
  });

  const checkbox = (state: EditorState) => {
    const builder = new RangeSetBuilder();
    syntaxTree(state).iterate({
      enter: (node) => {
        // console.log(node.name, node.from, node.to);
        if (node.name === 'TaskMarker') {
          builder.add(
            node.from,
            node.to,
            Decoration.replace({
              widget: new CheckboxWidget(node.from, () => lastPosition, isChecked(state, node.from)),
            }),
          );
        }
      },
    });

    return builder.finish();
  };

  return [
    listener,
    StateField.define<RangeSet<any>>({
      create: (state) => checkbox(state),
      update: (_: RangeSet<any>, tr: Transaction) => checkbox(tr.state),
      provide: (field) => EditorView.decorations.from(field),
    }),
  ];
};

// TODO(burdon): Reconcile with theme.
export const styles = EditorView.baseTheme({
  '& .cm-task-item': {
    padding: '0 4px',
  },
});

export const tasklist = () => [statefield(), styles];
