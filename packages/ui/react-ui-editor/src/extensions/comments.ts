//
// Copyright 2023 DXOS.org
//

import { type Extension, StateEffect, StateField, type Text } from '@codemirror/state';
import { hoverTooltip, keymap, type Command, Decoration, EditorView, type Rect } from '@codemirror/view';
import sortBy from 'lodash.sortby';

import { debounce } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { nonNullable } from '@dxos/util';

import { Cursor } from './cursor';
import { type CommentRange, type EditorModel, type Range } from '../hooks';
import { getToken } from '../styles';
import { callbackWrapper } from '../util';

// TODO(burdon): Reconcile with theme.
const styles = EditorView.baseTheme({
  '& .cm-comment': {
    backgroundColor: getToken('extend.colors.yellow.50'),
  },
  '& .cm-comment-active': {
    backgroundColor: getToken('extend.colors.yellow.100'),
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
    scrollIntoView: true, // TODO(burdon): Scroll to y-position (or center of screen?)
  });
};

export const setCommentRange = StateEffect.define<{ model: EditorModel; comments: CommentRange[] }>();

export const setSelection = StateEffect.define<CommentSelected>();

const setCommentState = StateEffect.define<CommentsState>();

/**
 * State field (reducer) that tracks comment ranges.
 * The ranges are tracked as Automerge cursors from which the absolute indexed ranges can be computed.
 */
const commentsStateField = StateField.define<CommentsState>({
  create: () => ({ ranges: [] }),
  update: (value, tr) => {
    const cursorConverter = tr.state.facet(Cursor.converter);

    for (const effect of tr.effects) {
      // Update selection.
      if (effect.is(setSelection)) {
        return { ...value, ...effect.value };
      }

      // Update range from store.
      if (effect.is(setCommentRange) && effect.value.comments.length > 0) {
        const { comments } = effect.value;
        const ranges: ExtendedCommentRange[] = comments
          .map((comment) => {
            // TODO(burdon): The range is incorrect after pasting. Race condition?
            const range = Cursor.getRangeFromCursor(cursorConverter, comment.cursor);
            console.log('update', JSON.stringify({ range, cursor: comment.cursor }, undefined, 2));
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

export type CommentsOptions = {
  /**
   * Key shortcut to create a new thread.
   */
  key?: string;
  /**
   * Called to create a new thread and return the thread id.
   */
  onCreate?: (cursor: string, location?: Rect | null) => string | undefined;
  /**
   * Selection cut/deleted.
   */
  onDelete?: (thread: string) => void;
  /**
   * Called when a comment is moved.
   */
  onUpdate?: (thread: string, cursor: string) => void;
  /**
   * Called to notify which thread is currently closest to the cursor.
   */
  onSelect?: (state: CommentsState) => void;
  /**
   * Called to render tooltip.
   */
  onHover?: (el: Element, shortcut: string) => void;
};

// TODO(burdon): Handle cut/restore via undo (need to integrate with history?)
const trackPastedComments = (onUpdate: NonNullable<CommentsOptions['onUpdate']>) => {
  // Cut/deleted comments.
  // Tracks indexed selections within text.
  let tracked: { text: Text; comments: { id: string; from: number; to: number }[] } | null = null;

  // Track cut or copy (enables cut-and-paste and copy-delete-paste to restore comment selection).
  const handleTrack = (event: Event, view: EditorView) => {
    const comments = view.state.field(commentsStateField);
    const { main } = view.state.selection;
    const selectedRanges = comments.ranges.filter(
      (range) => range.from >= main.from && range.to <= main.to && range.from < range.to,
    );

    if (!selectedRanges.length) {
      tracked = null;
    } else {
      tracked = {
        text: view.state.doc.slice(main.from, main.to),
        comments: selectedRanges.map((range) => ({
          id: range.id,
          from: range.from - main.from,
          to: range.to - main.from,
        })),
      };
    }
  };

  return [
    EditorView.domEventHandlers({
      cut: handleTrack,
      copy: handleTrack,
    }),

    // Handle paste.
    EditorView.updateListener.of(({ state, transactions }) => {
      if (tracked) {
        const paste = transactions.find((tr) => tr.isUserEvent('input.paste'));
        if (paste) {
          let found = -1;
          paste.changes.iterChanges((fromA, toA, fromB, toB, text) => {
            if (text.eq(tracked!.text)) {
              for (let i = transactions.indexOf(paste!) + 1; i < transactions.length; i++) {
                fromB = transactions[i].changes.mapPos(fromB);
              }

              found = fromB;
            }
          });

          if (found > -1) {
            const comments = tracked.comments;

            // TODO(burdon): Hack to defeat race condition (Automerge object hasn't updated yet).
            queueMicrotask(() => {
              const active = state.field(commentsStateField).ranges;
              for (const moved of comments) {
                if (active.some((range) => range.id === moved.id && range.from === range.to)) {
                  const range = {
                    from: found + moved.from,
                    to: found + moved.to,
                  };

                  const cursor = Cursor.getCursorFromRange(state.facet(Cursor.converter), range);
                  console.log('paste', JSON.stringify({ moved, range, cursor }, undefined, 2));
                  onUpdate(moved.id, cursor);
                }
              }
            });
          }

          tracked = null;
        }
      }
    }),
  ];
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
 * 5). Optionally, implements a hoverTooltip to show hints when creating a selection range.
 */
export const comments = (options: CommentsOptions = {}): Extension => {
  const { key: shortcut = "meta-'" } = options;

  const handleSelect = debounce((state: CommentsState) => options.onSelect?.(state), 200);

  /**
   * Create comment thread action.
   */
  const createCommentThread: Command = (view) => {
    const cursorConverter = view.state.facet(Cursor.converter);

    invariant(options.onCreate);
    const { from, to } = view.state.selection.main;
    if (from === to) {
      return false;
    }

    const cursor = Cursor.getCursorFromRange(cursorConverter, { from, to });
    if (cursor) {
      // Create thread via callback.
      const id = callbackWrapper(options.onCreate)(cursor, view.coordsAtPos(from));
      if (id) {
        // Update range.
        view.dispatch({
          effects: setSelection.of({ active: id }),
          selection: { anchor: from },
        });

        return true;
      }
    }

    return false;
  };

  return [
    commentsStateField,
    highlightDecorations,
    styles,

    //
    // Keymap.
    //
    options.onCreate
      ? keymap.of([
          {
            key: shortcut,
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
                  options.onHover?.(el, shortcut);
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
      const cursorConverter = view.state.facet(Cursor.converter);

      //
      // Test if need to recompute indexed range if document changes before the end of the range.
      //
      {
        let mod = false;
        const { active, ranges } = state.field(commentsStateField);
        changes.iterChanges((from, to, from2, to2) => {
          // TODO(burdon): Skip deleted (tracked) ranges.
          ranges.forEach((range) => {
            if (from2 === to2) {
              const newRange = Cursor.getRangeFromCursor(cursorConverter, range.cursor);
              if (!newRange || newRange.to - newRange.from === 0) {
                options.onDelete?.(range.id);
              }
            }

            if (from <= range.to) {
              const newRange = Cursor.getRangeFromCursor(cursorConverter, range.cursor);
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

        // TODO(burdon): Skip deleted (tracked) ranges.
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

    options.onUpdate ? trackPastedComments(options.onUpdate) : [],
  ];
};
