//
// Copyright 2023 DXOS.org
//

import { type EditorState } from '@codemirror/state';
import {
  EditorView,
  Decoration,
  WidgetType,
  MatchDecorator,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';

class CheckboxWidget extends WidgetType {
  constructor(
    private readonly _pos: number,
    private _checked: boolean,
    private readonly _indent: number,
    private readonly _onCheck: (check: boolean) => void,
  ) {
    super();
  }

  override eq(other: CheckboxWidget) {
    // Uniqueness based on position; also checks state.
    // TODO(burdon): Is this efficient? Check life-cycle.
    return this._pos === other._pos && this._checked === other._checked && this._indent === other._indent;
  }

  toDOM(view: EditorView) {
    // console.log('toDom', this._pos);
    const wrap = document.createElement('span');
    wrap.className = 'cm-task-item';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.setProperty('margin-left', this._indent * 24 + 'px');

    const box = wrap.appendChild(document.createElement('input'));
    box.type = 'checkbox';
    box.checked = this._checked;
    box.onclick = (event) => {
      this._checked = !isChecked(view.state, this._pos);
      this._onCheck(this._checked);
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

// TODO(burdon): Reconcile with theme.
const styles = EditorView.baseTheme({
  '& .cm-task-item': {
    paddingLeft: '4px',
    paddingRight: '8px',
  },
});

export const tasklist = () => {
  // TODO(burdon): Matcher isn't as precise as syntax tree.
  //  Allows for indents to be greater than AST would allow.
  const taskMatcher = new MatchDecorator({
    regexp: /^(\s*)- \[([ xX])\]\s/g,
    decoration: (match, view, pos) => {
      const indent = match[1].length / 2;
      const checked = match[2] === 'x' || match[2] === 'X';
      return Decoration.replace({
        widget: new CheckboxWidget(pos, checked, indent, (checked) => {
          const idx = pos + match[0].indexOf('[') + 1;
          view.dispatch({
            changes: {
              from: idx,
              to: idx + 1,
              insert: checked ? 'x' : ' ',
            },
            // TODO(burdon): Restore cursor position? More useful to move to end of line (can indent).
            selection: {
              anchor: idx + 3,
            },
          });
        }),
      });
    },
  });

  const tasks = ViewPlugin.fromClass(
    class {
      tasks: DecorationSet;
      constructor(view: EditorView) {
        this.tasks = taskMatcher.createDeco(view);
      }

      update(update: ViewUpdate) {
        this.tasks = taskMatcher.updateDeco(update, this.tasks);
      }
    },
    {
      decorations: (instance) => instance.tasks,
      provide: (plugin) =>
        EditorView.atomicRanges.of((view) => {
          return view.plugin(plugin)?.tasks || Decoration.none;
        }),
    },
  );

  return [
    // statefield(),
    tasks,
    styles,
  ];
};
