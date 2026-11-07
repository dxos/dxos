//
// Copyright 2026 DXOS.org
//

import { type Extension, StateField, Transaction } from '@codemirror/state';
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { Cursor } from '../../util/index.ts';
import { STATE_RESTORE_EVENT, documentId } from './selection.ts';

/** Where the user is in a document, as `from:to` cursor anchors. */
export type EditorLocation = {
  /** The main selection; a caret is a zero-width range. */
  selection?: string;
  /** The line at the top of the view. */
  viewport?: string;
};

/** Longest a change waits before it is reported; later changes in the window replace it. */
const REPORT_INTERVAL_MS = 250;

/** User event of the selection an editor places when it mounts, which no reader made. */
export const INITIAL_SELECTION_EVENT = 'org.dxos.cm.initial-selection';

/**
 * Whether the reader placed this view's selection. CodeMirror always has one, and mounting, a restore and a remote edit
 * set it too; any other selection (input, pointer, a vim motion, a Jump or comment reveal) is the reader's. Until then
 * the viewport says where they are.
 */
const readerSelected = StateField.define<boolean>({
  create: () => false,
  update: (selected, tr) =>
    selected ||
    (tr.selection !== undefined &&
      !tr.annotation(Transaction.remote) &&
      !tr.isUserEvent(INITIAL_SELECTION_EVENT) &&
      !tr.isUserEvent(STATE_RESTORE_EVENT)),
});

/**
 * Reports the caret and the top visible line to `report`, keyed by {@link documentId}, at most once
 * per {@link REPORT_INTERVAL_MS} while the user moves or scrolls.
 */
export const editorLocation = (report: (id: string, location: EditorLocation) => void): Extension => [
  readerSelected,
  ViewPlugin.fromClass(
    // One per view, so a report queued by a destroyed view never fires under the next.
    class {
      #timer: ReturnType<typeof setTimeout> | undefined;
      #pending: { id: string; location: EditorLocation } | undefined;

      // Read in CodeMirror's measure phase so a burst of scroll events costs one layout read per frame.
      readonly #measure = {
        key: this,
        read: (view: EditorView): EditorLocation => {
          const { state } = view;
          const { from, to } = state.selection.main;
          const selection = state.field(readerSelected) ? Cursor.getCursorFromRange(state, { from, to }) : undefined;
          const { top, left } = view.scrollDOM.getBoundingClientRect();
          const pos = view.posAtCoords({ x: left + 1, y: top + 1 });
          const lineStart = pos === null ? undefined : state.doc.lineAt(pos).from;
          const viewport =
            lineStart === undefined ? undefined : Cursor.getCursorFromRange(state, { from: lineStart, to: lineStart });
          return { selection, viewport };
        },
        write: (location: EditorLocation, view: EditorView) => {
          const id = view.state.facet(documentId);
          if (!id) {
            return;
          }
          this.#pending = { id, location };
          this.#timer ??= setTimeout(() => this.#flush(), REPORT_INTERVAL_MS);
        },
      };

      constructor(readonly view: EditorView) {}

      update(update: ViewUpdate) {
        if (update.selectionSet || update.docChanged || update.geometryChanged) {
          this.measure();
        }
      }

      destroy() {
        clearTimeout(this.#timer);
      }

      measure() {
        this.view.requestMeasure(this.#measure);
      }

      #flush() {
        this.#timer = undefined;
        if (this.#pending) {
          report(this.#pending.id, this.#pending.location);
          this.#pending = undefined;
        }
      }
    },
    {
      eventHandlers: {
        scroll() {
          this.measure();
        },
      },
    },
  ),
];
