//
// Copyright 2023 DXOS.org
//

import { type Extension, StateEffect, StateField } from '@codemirror/state';
import {
  hoverTooltip,
  keymap,
  type Command,
  type DecorationSet,
  type ViewUpdate,
  Decoration,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  WidgetType,
  hasHoverTooltips,
  closeHoverTooltips,
} from '@codemirror/view';
import sortBy from 'lodash.sortby';

import { debounce } from '@dxos/async';
import { invariant } from '@dxos/invariant';

import { type CommentRange, modelState } from '../../../hooks';

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
  // TODO(burdon): Rename comment?
  '& .cm-highlight': {
    backgroundColor: 'yellow',
  },
  '& .cm-highlight-active': {
    backgroundColor: 'lime',
  },
});

const marks = {
  highlight: Decoration.mark({ class: 'cm-highlight' }),
  highlightActive: Decoration.mark({ class: 'cm-highlight-active' }),
};

export type CommentsState = {
  active?: string;
  closest?: string;
  ranges: CommentRange[];
};

const setCommentsEffect = StateEffect.define<CommentsState>();

/**
 * State field that tracks highlight ranges.
 * The ranges are tracked as codemirror ranges (i.e., not relative YJS/Automerge positions), and
 * therefore must be updated when the document changes.
 *
 * Call dispatch to update:
 * ```ts
 * dispatch({ effects: setHighlights.of([selection]) })
 * ```
 */
// TODO(burdon): Use facet? Or computed from model?
const commentsStateField = StateField.define<CommentsState>({
  create: () => ({ ranges: [] }),
  update: (value, tr) => {
    for (const effect of tr.effects) {
      if (effect.is(setCommentsEffect)) {
        return effect.value;
      }
    }

    return value;
  },
});

/**
 * Decorate ranges.
 */
const highlightDecorations = EditorView.decorations.compute([commentsStateField], (state) => {
  const { active, ranges } = state.field(commentsStateField);
  const decorations =
    sortBy(ranges ?? [], (range) => range.from)?.flatMap((selection) => {
      const range = { from: selection.from, to: selection.to + 1 };
      if (selection.id === active) {
        return marks.highlightActive.range(range.from, range.to);
      } else {
        return marks.highlight.range(range.from, range.to);
      }
    }) ?? [];

  return Decoration.set(decorations);
});

/**
 * Optional bookmark widget at the start/end of the selection.
 * May correspond to a markdown bookmark.
 */
class BookmarkWidget extends WidgetType {
  constructor(
    private readonly _anchor: number,
    private readonly _id: string,
    private readonly _handleClick?: () => void,
  ) {
    super();
    invariant(this._id);
  }

  override eq(other: BookmarkWidget) {
    return this._anchor === other._anchor && this._id === other._id;
  }

  override toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-bookmark';
    span.textContent = '※';
    if (this._handleClick) {
      span.onclick = () => this._handleClick!();
    }
    return span;
  }
}

export type CommentsOptions = {
  key?: string;
  footnote?: boolean;
  /**
   * Called to create a new thread and return the thread id.
   */
  onCreate?: (range: string) => string | undefined;
  /**
   * Called to notify which thread is currently closest to the cursor.
   */
  onSelect?: (state: CommentsState) => void;
};

/**
 * Comment threads.
 * 1). Updates the EditorModel to store relative selections for a set of comments threads.
 *     Since the selections are relative, they do not need to be updated when the document is edited.
 *     TODO(burdon): Currently doesn't update or read from the model.
 * 2). Implements a StateField to track absolute selections corresponding to the comments (i.e., when the document is edited).
 *     TODO(burdon): Doesn't correctly update the statefield when the document is edited.
 * 3). Creates decoration marks to apply classes to each selection.
 * 4). Tracks the current cursor position to:
 *     a). Update the decoration to show if the cursor is within a current selection.
 *     b). Calls a handler to indicate which is the closest selection (e.g., to update the thread sidebar).
 * 5). Optionally, inserts a markdown footnote when creating a comment thread.
 * 6). Optionally, implements a hovertooltip to show hints when creating a selection range.
 */
export const comments = (options: CommentsOptions = {}): Extension => {
  const handleSelect = debounce((state: CommentsState) => options.onSelect?.(state), 200);

  /**
   * Create comment thread action.
   */
  const createCommentThread: Command = (view) => {
    const { head, from, to } = view.state.selection.main;
    const model = view.state.field(modelState);
    const range = model?.getModelPosition?.({ from, to });
    console.log('create', range, { from, to });
    if (range) {
      // Create thread via callback.
      const id = options.onCreate?.(range);
      if (id) {
        // Update range.
        // TODO(burdon): Update model (not state field directly) and read from computed property.
        const { ranges } = view.state.field(commentsStateField);
        view.dispatch({
          effects: setCommentsEffect.of({ active: id, ranges: [...ranges, { id, from, to, range }] }),
          selection: { anchor: from },
        });

        // Insert footnote.
        if (options.footnote) {
          const tag = `[^${id}]`;
          view.dispatch({
            changes: { from: head, insert: tag },
            selection: { anchor: head + tag.length },
          });
        }

        return true;
      }
    }

    return false;
  };

  /**
   * Bookmark widget decoration.
   */
  const bookmarksViewPlugin = ViewPlugin.fromClass(
    class BookmarkViewPlugin {
      // Match markdown footnotes (option).
      // https://www.markdownguide.org/extended-syntax/#footnotes
      static bookmarkMatcher = new MatchDecorator({
        regexp: /\[\^(\w+)\]/g,
        decoration: (match, view, pos) => {
          const id = match[1];
          return Decoration.replace({
            id,
            widget: new BookmarkWidget(pos, id),
          });
        },
      });

      bookmarks: DecorationSet;
      constructor(view: EditorView) {
        this.bookmarks = BookmarkViewPlugin.bookmarkMatcher.createDeco(view);
      }

      update(update: ViewUpdate) {
        this.bookmarks = BookmarkViewPlugin.bookmarkMatcher.updateDeco(update, this.bookmarks);
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

  return [
    bookmarksViewPlugin,
    commentsStateField,
    highlightDecorations,
    styles,

    //
    // Keymap.
    //
    options.onCreate
      ? keymap.of([
          {
            key: options?.key ?? 'shift-meta-c',
            run: createCommentThread,
          },
        ])
      : [],

    //
    // Hover tooltip (for key shortcut hints, etc.)
    //
    hoverTooltip((view, pos) => {
      const selection = view.state.selection.main;
      if (selection && pos >= selection.from && pos <= selection.to) {
        return {
          pos: selection.from,
          end: selection.to,
          above: true,
          create: () => {
            // TODO(burdon): Dispatch to react callback to render (or use SSR)?
            const el = document.createElement('div');
            el.innerText = 'Press shift-meta-c to create a comment.';
            return { dom: el, offset: { x: 0, y: 0 } };
          },
        };
      }

      return null;
    }),

    //
    // Monitor cursor movement and text updates.
    // TODO(burdon): Is there a better (finer grained) way to do this?
    //
    EditorView.updateListener.of(({ view, state, startState, changes }) => {
      //
      // Test if need to recompute ranges to update the state field.
      //
      {
        let mod = false;
        const model = state.field(modelState);
        const { active, ranges } = state.field(commentsStateField);
        changes.iterChanges((from, to, from2, to2) => {
          const idx = ranges.findIndex((comment) => from > comment.from && to < comment.to);
          if (idx !== -1) {
            // TODO(burdon): If deleting from the end of the selection then actually update the model range.
            const range = ranges[idx];
            const newRange = model?.getEditorRange?.(range.range);
            // TODO(burdon): The range doesn't change relative to the document.
            //  E.g., if characters are being inserted before (or inside of the range), then the new range should be updated.
            console.log('update', range.range, newRange);
            mod = true;
          }
        });

        if (mod) {
          view.dispatch({ effects: setCommentsEffect.of({ active, ranges }) });
        }
      }

      //
      // Track the current selection.
      //
      {
        const { head } = state.selection.main;

        let min = Infinity;
        const { active, closest, ranges } = state.field(commentsStateField);
        const next: CommentsState = { active: undefined, closest: undefined, ranges };
        ranges.forEach((comment) => {
          const d = Math.min(Math.abs(head - comment.from), Math.abs(head - comment.to));
          if (head >= comment.from && head <= comment.to) {
            next.active = comment.id;
          }
          if (d < min) {
            next.closest = comment.id;
            min = d;
          }
        });

        if (next.active !== active || next.closest !== closest) {
          view.dispatch({ effects: setCommentsEffect.of(next) });
          handleSelect(next);
        }
      }

      // Reset hover if moved.
      if (hasHoverTooltips(state)) {
        if (state.selection.main.head !== startState.selection.main.head) {
          view.dispatch({ effects: closeHoverTooltips });
        }
      }
    }),
  ];
};
