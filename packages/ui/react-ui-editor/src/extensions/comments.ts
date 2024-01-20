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
import { syncFacet } from './sync';
import { type Comment, type Range } from '../hooks';
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

type CommentState = {
  comment: Comment;
  range: Range;
  location?: Rect | null;
};

type SelectionState = {
  active?: string;
  closest?: string;
};

export type CommentsState = {
  comments: CommentState[];
  selection: SelectionState;
};

export const setFocus = (view: EditorView, thread: string) => {
  const comment = view.state.field(commentsState).comments.find((range) => range.comment.id === thread);
  if (!comment) {
    return;
  }

  view.dispatch({
    effects: setSelection.of({ active: thread }),
    selection: { anchor: comment.range.from },
    scrollIntoView: true, // TODO(burdon): Scroll to y-position (or center of screen?)
  });
};

export const setComments = StateEffect.define<Comment[]>();

export const setSelection = StateEffect.define<SelectionState>();

const setCommentState = StateEffect.define<CommentsState>();

/**
 * State field (reducer) that tracks comment ranges.
 * The ranges are tracked as Automerge cursors from which the absolute indexed ranges can be computed.
 */
const commentsState = StateField.define<CommentsState>({
  create: () => ({ comments: [], selection: {} }),
  update: (value, tr) => {
    for (const effect of tr.effects) {
      // Update selection.
      if (effect.is(setSelection)) {
        return { ...value, selection: effect.value };
      }

      // Update range from store.
      if (effect.is(setComments)) {
        const comments: CommentState[] = effect.value
          .map((comment) => {
            // Skip cut/deleted comments.
            if (!comment.cursor) {
              return undefined;
            }

            const range = Cursor.getRangeFromCursor(tr.state, comment.cursor);
            // console.log('update', JSON.stringify({ range, cursor: comment.cursor }, undefined, 2));
            return range && { comment, range };
          })
          .filter(nonNullable);

        return { ...value, comments };
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
// TODO(burdon): Remove index from selection (fix types).
const highlightDecorations = EditorView.decorations.compute([commentsState], (state) => {
  const {
    selection: { active },
    comments,
  } = state.field(commentsState);

  const decorations = sortBy(comments ?? [], (range) => range.range.from)
    ?.flatMap((comment) => {
      const range = comment.range;
      // const range = selection.comment.cursor && Cursor.getRangeFromCursor(state, selection.comment.cursor
      if (!range || range.from === range.to) {
        console.warn('Invalid range:', range);
        return undefined;
      }

      if (comment.comment.id === active) {
        return marks.highlightActive.range(range.from, range.to);
      } else {
        return marks.highlight.range(range.from, range.to);
      }
    })
    .filter(nonNullable);

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
  // TODO(burdon): Move to main state field?
  let tracked: { text: Text; comments: { id: string; from: number; to: number }[] } | null = null;

  // Track cut or copy (enables cut-and-paste and copy-delete-paste to restore comment selection).
  const handleTrack = (event: Event, view: EditorView) => {
    const comments = view.state.field(commentsState);
    const { main } = view.state.selection;
    const selectedRanges = comments.comments.filter(
      ({ range }) => range.from >= main.from && range.to <= main.to && range.from < range.to,
    );

    if (!selectedRanges.length) {
      tracked = null;
    } else {
      tracked = {
        text: view.state.doc.slice(main.from, main.to),
        comments: selectedRanges.map(({ comment, range }) => ({
          id: comment.id,
          from: range.from - main.from,
          to: range.to - main.from,
        })),
      };
    }

    // console.log('track', JSON.stringify({ tracked }, undefined, 2));
  };

  return [
    EditorView.domEventHandlers({
      cut: handleTrack,
      copy: handleTrack,
    }),

    // Handle paste.
    EditorView.updateListener.of(({ view, state, transactions }) => {
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
            // Sync before recomputing cursor/range.
            // TODO(burdon): Try to avoid this? See TextEditor dispatch.
            state.facet(syncFacet)?.reconcile(view);

            for (const moved of tracked.comments) {
              const range = {
                from: found + moved.from,
                to: found + moved.to,
              };

              const cursor = Cursor.getCursorFromRange(state, range);
              // console.log('paste', JSON.stringify({ moved, range, cursor }, undefined, 2));
              onUpdate(moved.id, cursor);
            }
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
    invariant(options.onCreate);
    const { from, to } = view.state.selection.main;
    if (from === to) {
      return false;
    }

    const cursor = Cursor.getCursorFromRange(view.state, { from, to });
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
    commentsState,
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
                  const el = document.createElement('div');
                  options.onHover!(el, shortcut);
                  return { dom: el, offset: { x: 0, y: 8 } };
                },
              };
            }

            return null;
          },
          {
            // TODO(burdon): Hide on change triggered immediately?
            // hideOnChange: true,
            hoverTime: 1_000,
          },
        )
      : [],

    //
    // Monitor cursor movement and text updates.
    // TODO(burdon): Is there a better (finer grained) way to do this?
    //
    EditorView.updateListener.of(({ view, state, changes }) => {
      //
      // Test if range deleted.
      //
      {
        let mod = false;
        const { comments, ...value } = state.field(commentsState);
        changes.iterChanges((from, to, from2, to2) => {
          comments.forEach(({ comment, range }) => {
            if (from2 === to2) {
              const newRange = Cursor.getRangeFromCursor(view.state, comment.cursor!);
              if (!newRange || newRange.to - newRange.from === 0) {
                options.onDelete?.(comment.id);
              }
            }

            // TODO(burdon): This shouldn't be necessary.
            if (from <= range.to) {
              const newRange = Cursor.getRangeFromCursor(view.state, comment.cursor!);
              Object.assign(range, newRange);
              mod = true;
            }
          });
        });

        if (mod) {
          view.dispatch({ effects: setCommentState.of({ comments, ...value }) });
        }
      }

      //
      // Track the current selection.
      //
      {
        const { head } = state.selection.main;

        let min = Infinity;
        const {
          selection: { active, closest },
          comments,
        } = state.field(commentsState);

        const selection: SelectionState = {};
        comments.forEach(({ comment, range }) => {
          if (head >= range.from && head <= range.to) {
            selection.active = comment.id;
            selection.closest = undefined;
          }

          if (!selection.active) {
            const d = Math.min(Math.abs(head - range.from), Math.abs(head - range.to));
            if (d < min) {
              selection.closest = comment.id;
              min = d;
            }
          }
        });

        if (selection.active !== active || selection.closest !== closest) {
          view.dispatch({ effects: setSelection.of(selection) });

          // Update callback.
          handleSelect({
            selection,
            comments: comments.map(({ comment, range }) => ({
              comment,
              range,
              location: view.coordsAtPos(range.from),
            })),
          });
        }
      }
    }),

    options.onUpdate ? trackPastedComments(options.onUpdate) : [],
  ];
};
