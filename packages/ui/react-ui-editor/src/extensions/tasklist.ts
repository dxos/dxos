//
// Copyright 2023 DXOS.org
//

import {
  EditorView,
  Decoration,
  WidgetType,
  MatchDecorator,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';

// TODO(burdon): Reconcile with theme.
const styles = EditorView.baseTheme({
  '& .cm-task-item': {
    paddingLeft: '4px',
    paddingRight: '8px',
  },
});

class CheckboxWidget extends WidgetType {
  constructor(
    private _checked: boolean,
    private readonly _indent: number,
    private readonly _onCheck?: (check: boolean) => void,
  ) {
    super();
  }

  override eq(other: this) {
    return this._checked === other._checked && this._indent === other._indent;
  }

  override toDOM(view: EditorView) {
    const wrap = document.createElement('span');
    wrap.className = 'cm-task-item';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.setProperty('margin-left', this._indent * 24 + 'px');

    const input = wrap.appendChild(document.createElement('input'));
    input.type = 'checkbox';
    input.checked = this._checked;
    if (!this._onCheck) {
      input.setAttribute('disabled', 'true');
    }
    if (this._onCheck) {
      input.onchange = (event: Event) => {
        this._onCheck?.((event.target as any).checked);
        return true;
      };
    }

    return wrap;
  }

  override ignoreEvent() {
    return false;
  }
}

export type TasklistOptions = {};

export const tasklist = (options: TasklistOptions = {}) => {
  // TODO(burdon): Matcher isn't as precise as syntax tree.
  //  Allows for indents to be greater than AST would allow.
  const taskMatcher = new MatchDecorator({
    regexp: /^(\s*)- \[([ xX])\]\s/g,
    decoration: (match, view, pos) => {
      const indent = Math.floor(match[1].length / 2);
      const checked = match[2] === 'x' || match[2] === 'X';
      return Decoration.replace({
        widget: new CheckboxWidget(
          checked,
          indent,
          view.state.readOnly
            ? undefined
            : (checked) => {
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
              },
        ),
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
      decorations: (value) => value.tasks,
      provide: (plugin) =>
        EditorView.atomicRanges.of((view) => {
          return view.plugin(plugin)?.tasks || Decoration.none;
        }),
    },
  );

  return [tasks, styles];
};
