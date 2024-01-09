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
  type Rect,
} from '@codemirror/view';
import get from 'lodash.get';
import sortBy from 'lodash.sortby';

import { debounce } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { nonNullable } from '@dxos/util';

import { type CommentRange, type EditorModel, type Range } from '../hooks';
import { tokens } from '../styles';
import { callbackWrapper, CursorConverter } from '../util';

// TODO(burdon): Handle delete, cut, copy, and paste (separately) text that includes comment range.
// TODO(burdon): Consider breaking into separate plugin (since not standalone)? Like mermaid?

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
  '& .cm-comment': {
    backgroundColor: get(tokens, 'extend.colors.yellow.50'),
  },
  '& .cm-comment-active': {
    backgroundColor: get(tokens, 'extend.colors.yellow.100'),
  },
});

const marks = {
  highlight: Decoration.mark({ class: 'cm-comment' }),
  highlightActive: Decoration.mark({ class: 'cm-comment-active' }),
};

// TODO(burdon): Should this be part of state?
type CommentSelected = {
  active?: string;
  closest?: string;
};

// TODO(burdon): Rename.
type ExtendedCommentRange = Range &
  CommentRange & {
    // TODO(burdon): Not part of state; just required for callback.
    location?: Rect | null;
  };

export type CommentsState = CommentSelected & {
  ranges: ExtendedCommentRange[];
};

export const setFocus = (view: EditorView, thread: string) => {
  const range = view.state.field(commentsStateField).ranges.find((range) => range.id === thread);
  if (!range) {
    return;
  }

  view.dispatch({
    effects: setSelection.of({ active: thread }),
    selection: { anchor: range.from },
    scrollIntoView: true,
  });
};

export const setCommentRange = StateEffect.define<{ model: EditorModel; comments: CommentRange[] }>();

export const setSelection = StateEffect.define<CommentSelected>();

const setCommentState = StateEffect.define<CommentsState>();

/**
 * State field (reducer) that tracks comment ranges.
 * The ranges are tracked as codemirror ranges (i.e., not relative YJS/Automerge positions), and
 * therefore must be updated when the document changes.
 */
const commentsStateField = StateField.define<CommentsState>({
  create: () => ({ ranges: [] }),
  update: (value, tr) => {
    const cursorConverter = tr.state.facet(CursorConverter);

    for (const effect of tr.effects) {
      // Update selection.
      if (effect.is(setSelection)) {
        return { ...value, ...effect.value };
      }

      // Update range from store.
      if (effect.is(setCommentRange)) {
        const { comments } = effect.value;
        const ranges: ExtendedCommentRange[] = comments
          .map((comment) => {
            const range = getRangeFromCursor(cursorConverter, comment.cursor);
            return range && { ...comment, ...range };
          })
          .filter(nonNullable);

        return { ...value, ranges };
      }

      // Update entire state.
      if (effect.is(setCommentState)) {
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
    sortBy(ranges ?? [], (range) => range.from)
      ?.flatMap((selection) => {
        // TODO(burdon): Invalid range (e.g., deleted).
        if (selection.from === selection.to) {
          return undefined;
        }

        const range = { from: selection.from, to: selection.to };
        if (selection.id === active) {
          return marks.highlightActive.range(range.from, range.to);
        } else {
          return marks.highlight.range(range.from, range.to);
        }
      })
      .filter(nonNullable) ?? [];

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
  /**
   * Called to render tooltip.
   */
  onHover?: (el: Element) => void;
};

/**
 * Comment threads.
 * 1). Updates the EditorModel to store relative selections for a set of comments threads.
 *     Since the selections are relative, they do not need to be updated when the document is edited.
 * 2). Implements a StateField to track absolute selections corresponding to the comments (i.e., when the document is edited).
 * 3). Creates decoration marks to apply classes to each selection.
 * 4). Tracks the current cursor position to:
 *     a). Update the decoration to show if the cursor is within a current selection.
 *     b). Calls a handler to indicate which is the closest selection (e.g., to update the thread sidebar).
 * 5). Optionally, inserts a markdown footnote when creating a comment thread.
 * 6). Optionally, implements a hoverTooltip to show hints when creating a selection range.
 */
export const comments = (options: CommentsOptions = {}): Extension => {
  const handleSelect = debounce((state: CommentsState) => options.onSelect?.(state), 200);

  /**
   * Create comment thread action.
   */
  const createCommentThread: Command = (view) => {
    const cursorConverter = view.state.facet(CursorConverter);

    invariant(options.onCreate);
    const { head, from, to } = view.state.selection.main;
    if (from === to) {
      return false;
    }

    const relPos = getCursorFromRange(cursorConverter, { from, to });
    if (relPos) {
      // Create thread via callback.
      const id = callbackWrapper(options.onCreate)(relPos);
      if (id) {
        // Update range.
        view.dispatch({
          effects: setSelection.of({ active: id }),
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
            key: options?.key ?? "meta-'",
            run: callbackWrapper(createCommentThread),
          },
        ])
      : [],

    //
    // Hover tooltip (for key shortcut hints, etc.)
    // TODO(burdon): Factor out to generic hints extension for current selection/line.
    //
    options.onHover
      ? hoverTooltip(
          (view, pos) => {
            const selection = view.state.selection.main;
            if (selection && pos >= selection.from && pos <= selection.to) {
              return {
                pos: selection.from,
                end: selection.to,
                above: true,
                create: () => {
                  // TODO(burdon): Dispatch to react callback to render (or use SSR)?
                  const el = document.createElement('div');
                  options.onHover?.(el);
                  return { dom: el, offset: { x: 0, y: 8 } };
                },
              };
            }

            return null;
          },
          { hideOnChange: true, hoverTime: 1000 },
        )
      : [],

    //
    // Monitor cursor movement and text updates.
    // TODO(burdon): Is there a better (finer grained) way to do this?
    //
    EditorView.updateListener.of(({ view, state, changes }) => {
      const cursorConverter = view.state.facet(CursorConverter);

      //
      // Test if need to recompute indexed range if document changes before the end of the range.
      //
      {
        let mod = false;
        const { active, ranges } = state.field(commentsStateField);
        changes.iterChanges((from, to, from2, to2) => {
          ranges.forEach((range) => {
            if (from2 === to2) {
              const newRange = getRangeFromCursor(cursorConverter, range.cursor);
              if (!newRange || newRange.to - newRange.from === 0) {
                // TODO(burdon): Delete range if empty.
                log.info('deleted comment', { thread: range.id });
              }
            }

            if (from <= range.to) {
              const newRange = getRangeFromCursor(cursorConverter, range.cursor);
              Object.assign(range, newRange);
              mod = true;
            }
          });
        });

        if (mod) {
          view.dispatch({ effects: setCommentState.of({ active, ranges }) });
        }
      }

      //
      // Track the current selection.
      //
      {
        const { head } = state.selection.main;

        let min = Infinity;
        const { active, closest, ranges } = state.field(commentsStateField);
        const selected: CommentSelected = { active: undefined, closest: undefined };
        ranges.forEach((comment) => {
          const d = Math.min(Math.abs(head - comment.from), Math.abs(head - comment.to));
          if (head >= comment.from && head <= comment.to) {
            selected.active = comment.id;
          }
          if (d < min) {
            selected.closest = comment.id;
            min = d;
          }
        });

        if (selected.active !== active || selected.closest !== closest) {
          view.dispatch({ effects: setSelection.of(selected) });

          // Update callback.
          handleSelect({
            ...selected,
            ranges: ranges.map((range) => ({ ...range, location: view.coordsAtPos(range.from) })),
          });
        }
      }
    }),
  ];
};

const getCursorFromRange = (cursorConverter: CursorConverter, range: Range) => {
  const from = cursorConverter.toCursor(range.from);
  const to = cursorConverter.toCursor(range.to, -1);
  return [from, to].join(':');
};

const getRangeFromCursor = (cursorConverter: CursorConverter, cursor: string) => {
  const parts = cursor.split(':');
  const from = cursorConverter.fromCursor(parts[0]);
  const to = cursorConverter.fromCursor(parts[1]);
  return from !== undefined && to !== undefined ? { from, to } : undefined;
};
