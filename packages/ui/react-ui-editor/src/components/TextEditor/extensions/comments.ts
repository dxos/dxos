//
// Copyright 2023 DXOS.org
//

import { type Extension } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  keymap,
  MatchDecorator,
  type Rect,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from '@codemirror/view';

import { invariant } from '@dxos/invariant';

// 1. TODO(burdon): Make atomic (for tasklist also).
//    - https://discuss.codemirror.net/t/easily-track-remove-content-with-decorations/4606
//    - https://discuss.codemirror.net/t/creating-atomic-replace-decorations/2961
//    - https://codemirror.net/docs/ref/#state.EditorState%5EtransactionFilter (transaction filter: move, delete).
// 2. TODO(burdon): Create/track threads in composer (change global state). Select/follow. Scroll with page.
// 3. TODO(burdon): Support multiple threads in sidebar?
// 4. TODO(burdon): Anchor AI thread when creating section.
// 5. TODO(burdon): Button to resolve thread to close comments.

// 6. TODO(burdon): Perf: Update existing rangeset.
//  https://discuss.codemirror.net/t/rangeset-with-metadata-and-different-decorations/3874

// TODO(burdon): Import note (performance):
//  Easily track & remove content with decorations
//  https://discuss.codemirror.net/t/easily-track-remove-content-with-decorations/4606

class BookmarkWidget extends WidgetType {
  constructor(private readonly _pos: number, private readonly _id: string) {
    super();
    invariant(this._id);
  }

  override eq(other: BookmarkWidget) {
    return this._id === other._id;
  }

  // TODO(burdon): Click to select.
  override toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-bookmark';
    // https://emojifinder.com/comment
    span.textContent = '💬';
    return span;
  }
}

// TODO(burdon): Reconcile with theme.
export const styles = EditorView.baseTheme({
  '& .cm-bookmark': {
    cursor: 'pointer',
    margin: '4px',
    padding: '4px',
    backgroundColor: 'yellow',
  },
});

export type CommentOptions = {
  key?: string;
  onCreate?: () => string;
  onUpdate?: (info: { pos: number; location: Rect }) => void;
};

// https://www.markdownguide.org/extended-syntax/#footnotes
// TODO(burdon): Record span in automerge model?
// TODO(burdon): Extended markdown: https://www.markdownguide.org/extended-syntax
export const comments = (options: CommentOptions = {}): Extension => {
  const matchDecorator = new MatchDecorator({
    regexp: /\[\^(\w+)\]/g,
    decoration: (match, view, pos) => {
      return Decoration.replace({
        widget: new BookmarkWidget(pos, match[1]),
      });
    },
  });

  // TODO(burdon): Reuse for tasks? Requires more complex AST parsing.
  const bookmarks = ViewPlugin.fromClass(
    class {
      private tasks: DecorationSet;
      constructor(view: EditorView) {
        this.tasks = matchDecorator.createDeco(view);
      }

      update(update: ViewUpdate) {
        this.tasks = matchDecorator.updateDeco(update, this.tasks);
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
    keymap.of([
      {
        key: options?.key ?? 'alt-meta-c',
        run: (view) => {
          // Insert footnote.
          const id = options.onCreate?.();
          if (id) {
            const pos = view.state.selection.main.head;
            const tag = `[^${id}]`;
            view.dispatch({
              changes: { from: pos, insert: tag },
              selection: { anchor: pos + tag.length },
            });

            return true;
          }

          return false;
        },
      },
    ]),

    bookmarks,

    // Monitor cursor movement.
    EditorView.updateListener.of((update) => {
      const view = update.view;
      const pos = view.state.selection.main.head;

      const decorations: { from: number; to: number; value: Decoration }[] = [];
      const rangeSet = view.plugin(bookmarks)?.tasks;
      rangeSet?.between(pos, pos + 1, (from, to, value) => {
        if (value.spec.widget) {
          decorations.push({ from, to, value });
        }
      });

      if (decorations.length) {
        const location = view.coordsAtPos(decorations[0].from);
        if (location) {
          options.onUpdate?.({ pos, location });
        }
      }
    }),

    styles,
  ];
};
