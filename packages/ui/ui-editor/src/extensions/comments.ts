//
// Copyright 2023 DXOS.org
//

import { invertedEffects } from '@codemirror/commands';
import { type ChangeDesc, type Extension, StateEffect, StateField, type Text } from '@codemirror/state';
import {
  type Command,
  Decoration,
  EditorView,
  type PluginValue,
  type Rect,
  ViewPlugin,
  hoverTooltip,
  keymap,
} from '@codemirror/view';
import sortBy from 'lodash.sortby';
import { useEffect } from 'react';

import { type CleanupFn, debounce } from '@dxos/async';
import { log } from '@dxos/log';
import { isNonNullable } from '@dxos/util';

import { type Comment, type Range, type RenderCallback } from '../types';
import { Cursor, callbackWrapper, singleValueFacet } from '../util';

import { documentId } from './selection';

//
// State management.
//

type CommentState = {
  comment: Comment;
  range: Range;
  location?: Rect | null;
};

type SelectionState = {
  current?: string;
  closest?: string;
};

export type CommentsState = {
  id?: string;
  comments: CommentState[];
  selection: SelectionState;
};

export const setComments = StateEffect.define<{ id: string; comments: Comment[] }>();

export const setSelection = StateEffect.define<SelectionState>();

const setCommentState = StateEffect.define<CommentsState>();

/**
 * State field (reducer) that tracks comment ranges.
 * The ranges are tracked as Automerge cursors from which the absolute indexed ranges can be computed.
 */
export const commentsState = StateField.define<CommentsState>({
  create: (state) => ({
    id: state.facet(documentId),
    comments: [],
    selection: {},
  }),
  update: (value, tr) => {
    for (const effect of tr.effects) {
      // Update selection.
      if (effect.is(setSelection)) {
        return { ...value, selection: effect.value };
      }

      // Update range from store.
      if (effect.is(setComments)) {
        const { comments } = effect.value;
        const commentStates: CommentState[] = comments
          .map((comment) => {
            // Skip cut/deleted comments.
            if (!comment.cursor) {
              return undefined;
            }

            const range = Cursor.getRangeFromCursor(tr.state, comment.cursor);
            return range && { comment, range };
          })
          .filter(isNonNullable);

        return { ...value, comments: commentStates };
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
 * NOTE: Matches search.
 */
const styles = EditorView.theme({
  '.cm-comment, .cm-comment-current': {
    padding: '3px 0',
    color: 'var(--dx-cmCommentText)',
    backgroundColor: 'var(--dx-cmCommentSurface)',
  },
  '.cm-comment > span, .cm-comment-current > span': {
    boxDecorationBreak: 'clone',
    boxShadow: '0 0 1px 3px var(--dx-cmCommentSurface)',
    backgroundColor: 'var(--dx-cmCommentSurface)',
    color: 'var(--dx-cmCommentText)',
    cursor: 'pointer',
  },
});

const createCommentMark = (id: string, isCurrent: boolean) =>
  Decoration.mark({
    class: isCurrent ? 'cm-comment-current' : 'cm-comment',
    attributes: {
      'data-testid': 'cm-comment',
      'data-comment-id': id,
    },
  });

/**
 * Decorate ranges.
 */
const commentsDecorations = EditorView.decorations.compute([commentsState], (state) => {
  const {
    selection: { current },
    comments,
  } = state.field(commentsState);

  const decorations = sortBy(comments ?? [], (range) => range.range.from)
    ?.flatMap((comment) => {
      const range = comment.range;
      if (!range) {
        log.warn('Invalid range:', range);
        return undefined;
      } else if (range.from === range.to) {
        // Skip empty ranges. This can happen when a comment is cut or deleted.
        return undefined;
      }

      const mark = createCommentMark(comment.comment.id, comment.comment.id === current);
      return mark.range(range.from, range.to);
    })
    .filter(isNonNullable);

  return Decoration.set(decorations);
});

export const commentClickedEffect = StateEffect.define<string>();

const handleCommentClick = EditorView.domEventHandlers({
  click: (event, view) => {
    let target = event.target as HTMLElement;
    const editorRoot = view.dom;

    // Traverse up the DOM tree looking for an element with data-comment-id
    // Stop if we reach the editor root or find the comment id
    while (target && target !== editorRoot && !target.hasAttribute('data-comment-id')) {
      target = target.parentElement as HTMLElement;
    }

    // Check if we found a comment id and are still within the editor
    if (target && target !== editorRoot) {
      const commentId = target.getAttribute('data-comment-id');
      if (commentId) {
        view.dispatch({ effects: commentClickedEffect.of(commentId) });
        return true;
      }
    }

    return false;
  },
});

//
// Cut-and-paste.
//

type TrackedComment = { id: string; from: number; to: number };

const trackPastedComments = (onUpdate: NonNullable<CommentsOptions['onUpdate']>) => {
  // Tracks indexed selections within text.
  let tracked: { text: Text; comments: TrackedComment[] } | null = null;

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
  };

  return [
    EditorView.domEventHandlers({
      cut: handleTrack,
      copy: handleTrack,
    }),

    // Track deleted comments.
    invertedEffects.of((tr) => {
      const { comments } = tr.startState.field(commentsState);
      const effects: StateEffect<any>[] = [];
      tr.changes.iterChangedRanges((fromA, toA) => {
        for (const {
          comment: { id },
          range: { from, to },
        } of comments) {
          if (from < to && from >= fromA && to <= toA) {
            effects.push(restoreCommentEffect.of({ id, from, to }));
          }
        }
      });

      return effects;
    }),

    // Handle paste or the undo of comment deletion.
    EditorView.updateListener.of((update) => {
      const restore: TrackedComment[] = [];

      for (let i = 0; i < update.transactions.length; i++) {
        const tr = update.transactions[i];
        for (let j = 0; j < restore.length; j++) {
          restore[j] = mapTrackedComment(restore[j], tr.changes);
        }
        for (const effect of tr.effects) {
          if (effect.is(restoreCommentEffect)) {
            restore.push(effect.value);
          }
        }
      }

      if (tracked) {
        const paste = update.transactions.find((tr) => tr.isUserEvent('input.paste'));
        if (paste) {
          let found = -1;
          paste.changes.iterChanges((fromA, toA, fromB, toB, text) => {
            if (text.eq(tracked!.text)) {
              for (let i = update.transactions.indexOf(paste!) + 1; i < update.transactions.length; i++) {
                fromB = update.transactions[i].changes.mapPos(fromB);
              }

              found = fromB;
            }
          });

          if (found > -1) {
            for (const moved of tracked.comments) {
              restore.push({ id: moved.id, from: found + moved.from, to: found + moved.to });
            }
          }

          tracked = null;
        }
      }

      for (const comment of restore) {
        const { comments } = update.startState.field(commentsState);
        const exists = comments.some((c) => c.comment.id === comment.id && c.range.from < c.range.to);
        if (!exists) {
          const cursor = Cursor.getCursorFromRange(update.state, comment);
          onUpdate({ id: comment.id, cursor });
        }
      }
    }),
  ];
};

const mapTrackedComment = (comment: TrackedComment, changes: ChangeDesc) => ({
  id: comment.id,
  from: changes.mapPos(comment.from, 1),
  to: changes.mapPos(comment.to, 1),
});

/**
 * These are attached to undone/redone transactions in the editor for the purpose of restoring comments
 * that were deleted by the original changes.
 */
const restoreCommentEffect = StateEffect.define<TrackedComment>({ map: mapTrackedComment });

/**
 * Create comment thread action.
 */
export const createComment: Command = (view) => {
  const options = view.state.facet(optionsFacet);
  const { from, to } = view.state.selection.main;
  if (from === to) {
    return false;
  }

  // Don't allow selection at end of document.
  if (to === view.state.doc.length) {
    view.dispatch({
      changes: {
        from: to,
        insert: '\n',
      },
    });
  }

  const cursor = Cursor.getCursorFromRange(view.state, { from, to });
  if (cursor) {
    // Create thread via callback.
    options.onCreate?.({ cursor, from, location: view.coordsAtPos(from) });
    return true;
  }

  return false;
};

//
// Options
//

export type CommentsOptions = {
  /**
   * Document id.
   */
  id?: string;
  /**
   * Key shortcut to create a new thread.
   */
  key?: string;
  /**
   * Called to render tooltip.
   */
  renderTooltip?: RenderCallback<{ shortcut: string }>;
  /**
   * Called to create a new thread and return the thread id.
   */
  onCreate?: (params: { cursor: string; from: number; location?: Rect | null }) => void;
  /**
   * Selection cut/deleted.
   */
  onDelete?: (params: { id: string }) => void;
  /**
   * Called when a comment is moved.
   */
  onUpdate?: (params: { id: string; cursor: string }) => void;
  /**
   * Called to notify which thread is currently closest to the cursor.
   */
  onSelect?: (state: CommentsState) => void;
};

const optionsFacet = singleValueFacet<CommentsOptions>();

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

  return [
    optionsFacet.of(options),
    options.id ? documentId.of(options.id) : undefined,
    commentsState,
    commentsDecorations,
    handleCommentClick,
    styles,

    //
    // Keymap.
    //
    options.onCreate &&
      keymap.of([
        {
          key: shortcut,
          run: callbackWrapper(createComment),
        },
      ]),

    //
    // Hover tooltip (for key shortcut hints, etc.)
    // TODO(burdon): Factor out to generic hints extension for current selection/line.
    //
    options.renderTooltip &&
      hoverTooltip(
        (view, pos) => {
          const selection = view.state.selection.main;
          if (selection && pos >= selection.from && pos <= selection.to) {
            return {
              pos: selection.from,
              end: selection.to,
              above: true,
              create: () => {
                const el = document.createElement('div');
                options.renderTooltip!(el, { shortcut }, view);
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
      ),

    //
    // Track deleted ranges and update ranges for decorations.
    //
    EditorView.updateListener.of(({ view, state, changes }) => {
      let mod = false;
      const { comments, ...value } = state.field(commentsState);
      changes.iterChanges((from, to, from2, to2) => {
        comments.forEach(({ comment, range }) => {
          // Test if range deleted.
          if (from2 === to2) {
            const newRange = Cursor.getRangeFromCursor(view.state, comment.cursor!);
            if (!newRange || newRange.to - newRange.from === 0) {
              options.onDelete?.({ id: comment.id });
            }
          }

          // Update range.
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
    }),

    //
    // Track selection/proximity.
    //
    EditorView.updateListener.of(({ view, state }) => {
      let min = Infinity;
      const {
        selection: { current, closest },
        comments,
      } = state.field(commentsState);

      const { head } = state.selection.main;
      const selection: SelectionState = {};
      comments.forEach(({ comment, range }) => {
        if (head >= range.from && head <= range.to) {
          selection.current = comment.id;
          selection.closest = undefined;
        }

        if (!selection.current) {
          const d = Math.min(Math.abs(head - range.from), Math.abs(head - range.to));
          if (d < min) {
            selection.closest = comment.id;
            min = d;
          }
        }
      });

      if (selection.current !== current || selection.closest !== closest) {
        view.dispatch({ effects: setSelection.of(selection) });

        // Update callback.
        handleSelect({
          selection,
          id: state.facet(documentId),
          comments: comments.map(({ comment, range }) => ({
            comment,
            range,
            location: view.coordsAtPos(range.from),
          })),
        });
      }
    }),

    options.onUpdate && trackPastedComments(options.onUpdate),
  ].filter(isNonNullable);
};

//
// Utils.
//

export const scrollThreadIntoView = (view: EditorView, id: string, center = true) => {
  const comment = view.state.field(commentsState).comments.find((range) => range.comment.id === id);
  if (!comment?.comment.cursor) {
    return;
  }
  const range = Cursor.getRangeFromCursor(view.state, comment.comment.cursor);
  if (range) {
    const currentSelection = view.state.selection.main;
    const currentScrollPosition = view.scrollDOM.scrollTop;
    const targetScrollPosition = view.coordsAtPos(range.from)?.top;

    const needsScroll =
      targetScrollPosition !== undefined &&
      (targetScrollPosition < currentScrollPosition ||
        targetScrollPosition > currentScrollPosition + view.scrollDOM.clientHeight);

    const needsSelectionUpdate = currentSelection.from !== range.from || currentSelection.to !== range.from;

    if (needsScroll || needsSelectionUpdate) {
      view.dispatch({
        selection: needsSelectionUpdate ? { anchor: range.from } : undefined,
        effects: [
          needsScroll ? EditorView.scrollIntoView(range.from, center ? { y: 'center' } : undefined) : [],
          needsSelectionUpdate ? setSelection.of({ current: id }) : [],
        ].flat(),
      });
    }
  }
};

/**
 * Manages external comment synchronization for the editor.
 * This class subscribes to external comment updates and applies them to the editor view.
 */
class ExternalCommentSync implements PluginValue {
  private readonly unsubscribe: () => void;

  constructor(view: EditorView, id: string, subscribe: (sink: () => void) => CleanupFn, getComments: () => Comment[]) {
    const updateComments = () => {
      const comments = getComments();
      if (id === view.state.facet(documentId)) {
        queueMicrotask(() => view.dispatch({ effects: setComments.of({ id, comments }) }));
      }
    };

    this.unsubscribe = subscribe(updateComments);
  }

  destroy = () => {
    this.unsubscribe();
  };
}

// TODO(burdon): Needs comment.
export const createExternalCommentSync = (
  id: string,
  subscribe: (sink: () => void) => CleanupFn,
  getComments: () => Comment[],
): Extension =>
  ViewPlugin.fromClass(
    class {
      constructor(view: EditorView) {
        return new ExternalCommentSync(view, id, subscribe, getComments);
      }
    },
  );

/**
 * @deprecated This hook will be removed in future versions. Use the new comment sync extension instead.
 * Update comments state field.
 */
export const useComments = (view: EditorView | null | undefined, id: string, comments?: Comment[]) => {
  useEffect(() => {
    if (view) {
      // Check same document.
      // NOTE: Hook might be called before editor state is updated.
      if (id === view.state.facet(documentId)) {
        view.dispatch({
          effects: setComments.of({ id, comments: comments ?? [] }),
        });
      }
    }
  });
};
