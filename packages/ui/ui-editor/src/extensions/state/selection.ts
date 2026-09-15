//
// Copyright 2024 DXOS.org
//

import { type Extension, Transaction, type TransactionSpec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import { debounce } from '@dxos/async';
import { isTruthy } from '@dxos/util';

import { singleValueFacet } from '../../util/index.ts';

/**
 * Currently edited document id as FQ string.
 */
export const documentId = singleValueFacet<string>();

export type EditorSelection = {
  anchor: number;
  head?: number;
};

export type EditorSelectionState = {
  scrollTo?: number;
  /** Pixels the anchored line is scrolled past, so a restore lands exactly where recording happened. */
  scrollOffset?: number;
  selection?: EditorSelection;
};

export const EditorSelection = Schema.Struct({
  anchor: Schema.Number,
  head: Schema.optional(Schema.Number),
}).mapFields(Struct.map(Schema.mutableKey));

export const EditorSelectionStateSchema = Schema.Struct({
  scrollTo: Schema.optional(Schema.Number),
  scrollOffset: Schema.optional(Schema.Number),
  selection: Schema.optional(EditorSelection),
}).mapFields(Struct.map(Schema.mutableKey));

export type EditorStateStore = {
  setState: (id: string, state: EditorSelectionState) => void;
  getState: (id: string) => EditorSelectionState | undefined;
};

const stateRestoreAnnotation = 'org.dxos.cm.state-restore';

/** Window after a restore during which scroll events are not recorded. */
const RESTORE_SUPPRESS_MS = 500;

/**
 * Builds the transaction that puts a recorded state back: applies the selection, anchors
 * `scrollTo` at the top of the viewport (falling back to revealing the selection when no position
 * was recorded), and tags itself so the recorder ignores the scroll it causes.
 */
export const createEditorStateTransaction = ({ scrollTo, selection }: EditorSelectionState): TransactionSpec => {
  return {
    selection,
    scrollIntoView: scrollTo == null,
    // `scrollTo` is the position that was at the top of the viewport, so restore it there
    // exactly; a y-margin would offset every restore by that margin.
    effects: scrollTo != null ? EditorView.scrollIntoView(scrollTo, { y: 'start', yMargin: 0 }) : undefined,
    annotations: Transaction.userEvent.of(stateRestoreAnnotation),
  };
};

/**
 * Restores a recorded position: the transaction anchors the line at the top of the viewport, then
 * the sub-line offset is re-applied once CodeMirror has measured, so repeated round-trips do not
 * creep upwards by the fraction of the line that was originally scrolled past.
 */
export const restoreEditorState = (view: EditorView, state: EditorSelectionState) => {
  view.dispatch(createEditorStateTransaction(state));
  const { scrollTo, scrollOffset } = state;
  if (scrollTo != null && scrollOffset) {
    requestAnimationFrame(() => {
      view.scrollDOM.scrollTop += scrollOffset;
    });
  }
};

/**
 * Track scrolling and selection state to be restored when switching to document.
 */
export const selectionState = ({ getState, setState }: Partial<EditorStateStore> = {}): Extension => {
  const setStateDebounced = debounce(setState!, 1_000);

  // A restore dispatches its own scroll, which would immediately record a position measured
  // before the document has finished laying out; ignore scroll events for a beat afterwards.
  let suppressUntil = 0;

  const record = (view: EditorView) => {
    const id = view.state.facet(documentId);
    if (!id || !setState || performance.now() < suppressUntil) {
      return;
    }

    // `posAtCoords` takes client coordinates, so measure from the scroller's own rect rather
    // than from `scrollTop` (which only coincides when the scroller sits at the top of the window).
    const { top, left } = view.scrollDOM.getBoundingClientRect();
    const pos = view.posAtCoords({ x: left + 1, y: top + 1 });
    if (pos !== null) {
      const { anchor, head } = view.state.selection.main;
      // Measure against the position's own visual row (`coordsAtPos`), not its line block: with
      // line wrapping the top of the viewport is often a continuation row, and a block-relative
      // offset would then overshoot the restore by every wrapped row above it.
      const coords = view.coordsAtPos(pos);
      const scrollOffset = coords ? Math.round(top - coords.top) : 0;
      setStateDebounced(id, { scrollTo: pos, scrollOffset, selection: { anchor, head } });
    }
  };

  return [
    EditorView.domEventHandlers({
      scroll: (_event, view) => {
        record(view);
      },
    }),
    EditorView.updateListener.of(({ view, transactions }) => {
      if (transactions.some((tr) => tr.isUserEvent(stateRestoreAnnotation))) {
        suppressUntil = performance.now() + RESTORE_SUPPRESS_MS;
        return;
      }

      record(view);
    }),
    getState &&
      keymap.of([
        {
          key: 'Ctrl-r', // TODO(burdon): Setting to jump back to selection.
          run: (view) => {
            const state = getState(view.state.facet(documentId));
            // Only restore when something was actually stored; a store may return an empty state
            // (no scroll/selection) for an unseen document, which would otherwise dispatch a no-op.
            if (state && (state.scrollTo != null || state.selection)) {
              restoreEditorState(view, state);
            }
            return true;
          },
        },
      ]),
  ].filter(isTruthy);
};
