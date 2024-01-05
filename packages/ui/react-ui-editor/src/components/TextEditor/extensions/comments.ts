//
// Copyright 2023 DXOS.org
//

import { type Extension } from '@codemirror/state';
import {
  keymap,
  type DecorationSet,
  type Rect,
  type ViewUpdate,
  Decoration,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  WidgetType,
} from '@codemirror/view';

import { debounce } from '@dxos/async';
import { invariant } from '@dxos/invariant';

// TODO(burdon): Reconcile with theme.
const styles = EditorView.baseTheme({
  '& .cm-bookmark': {
    cursor: 'pointer',
    margin: '4px',
    padding: '4px',
    backgroundColor: 'yellow',
  },
  '& .cm-bookmark-selected': {
    backgroundColor: 'orange',
  },
});

class BookmarkWidget extends WidgetType {
  constructor(private readonly _pos: number, private readonly _id: string, private readonly _handleClick: () => void) {
    super();
    invariant(this._id);
  }

  override eq(other: BookmarkWidget) {
    return this._id === other._id;
  }

  override toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-bookmark';
    span.textContent = '§';
    span.onclick = () => this._handleClick();
    return span;
  }
}

type CommentsInfo = {
  active?: string;
  items?: { id: string; pos: number; location: Rect | null }[];
};

export type CommentsOptions = {
  key?: string;
  onCreate?: (from: number, to: number) => string | void;
  onUpdate?: (info: CommentsInfo) => void;
};

// https://www.markdownguide.org/extended-syntax/#footnotes
// TODO(burdon): Record span in automerge model?
// TODO(burdon): Extended markdown: https://www.markdownguide.org/extended-syntax
export const comments = (options: CommentsOptions = {}): Extension => {
  let active: string | undefined;

  const bookmarkMatcher = new MatchDecorator({
    regexp: /\[\^(\w+)\]/g,
    decoration: (match, view, pos) => {
      const id = match[1];
      return Decoration.replace({
        id,
        widget: new BookmarkWidget(pos, id, () => handleUpdate({ active: id })),
      });
    },
  });

  const bookmarks = ViewPlugin.fromClass(
    class {
      bookmarks: DecorationSet;
      constructor(view: EditorView) {
        this.bookmarks = bookmarkMatcher.createDeco(view);
      }

      update(update: ViewUpdate) {
        this.bookmarks = bookmarkMatcher.updateDeco(update, this.bookmarks);
      }
    },
    {
      decorations: (instance) => instance.bookmarks,
      provide: (plugin) =>
        EditorView.atomicRanges.of((view) => {
          return view.plugin(plugin)?.bookmarks || Decoration.none;
        }),
    },
  );

  const handleUpdate = debounce((data: CommentsInfo) => {
    options.onUpdate?.(data);
  }, 200);

  return [
    keymap.of([
      {
        key: options?.key ?? 'shift-meta-c',
        run: (view) => {
          // Insert footnote.
          const { from, to, head } = view.state.selection.main;
          const id = options.onCreate?.(from, to);
          if (id) {
            const tag = `[^${id}]`;
            // TODO(burdon): Add selection.
            view.dispatch({
              changes: { from: head, insert: tag },
              selection: { anchor: head + tag.length },
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
      active = undefined;
      if (!options.onUpdate) {
        return;
      }

      const { view, state } = update;
      const pos = state.selection.main.head;

      const decorations: { from: number; to: number; value: Decoration }[] = [];
      const rangeSet = view.plugin(bookmarks)?.bookmarks;
      let closest = Infinity;
      // TODO(burdon): Handle multiple visible ranges in large documents.
      const { from, to } = /* view.visibleRanges?.[0] ?? */ { from: 0, to: state.doc.length };
      rangeSet?.between(from, to, (from, to, value) => {
        decorations.push({ from, to, value });
        const d = Math.min(Math.abs(pos - from), Math.abs(pos - to));
        if (d < closest) {
          // TODO(burdon): Update class of selected.
          active = value.spec.id;
          closest = d;
        }
      });

      if (decorations.length) {
        handleUpdate({
          active,
          items: decorations.map(
            ({
              from,
              value: {
                spec: { id },
              },
            }) => ({ id: id as string, pos: from, location: view.coordsAtPos(from) }),
          ),
        });
      }
    }),

    styles,
  ];
};
