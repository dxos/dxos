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
    return this._pos === other._pos && this._checked === other._checked && this._indent === other._indent;
  }

  toDOM(view: EditorView) {
    const wrap = document.createElement('span');
    wrap.className = 'cm-task-item';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.setProperty('margin-left', this._indent * 24 + 'px');

    const input = wrap.appendChild(document.createElement('input'));
    input.type = 'checkbox';
    input.checked = this._checked;
    input.onchange = (event: Event) => {
      this._onCheck((event.target as any).checked);
      return true;
    };

    return wrap;
  }

  override ignoreEvent() {
    return false;
  }
}

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
      const indent = Math.floor(match[1].length / 2);
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

  return [tasks, styles];
};
