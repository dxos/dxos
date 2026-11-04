//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { Cursor } from '../../util/index.ts';
import { documentId } from './selection.ts';

/** Where the user is in a document, as `from:to` cursor anchors. */
export type EditorLocation = {
  /** The main selection; a caret is a zero-width range. */
  selection?: string;
  /** The line at the top of the view. */
  viewport?: string;
};

/** Longest a change waits before it is reported; later changes in the window replace it. */
const REPORT_INTERVAL_MS = 250;

const measureKey = {};

/**
 * Reports the caret and the top visible line to `report`, keyed by {@link documentId}, at most once
 * per {@link REPORT_INTERVAL_MS} while the user moves or scrolls.
 */
export const editorLocation = (report: (id: string, location: EditorLocation) => void): Extension => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: { id: string; location: EditorLocation } | undefined;
  const flush = () => {
    timer = undefined;
    if (pending) {
      report(pending.id, pending.location);
      pending = undefined;
    }
  };

  // Read in CodeMirror's measure phase so a burst of scroll events costs one layout read per frame.
  const measure = {
    key: measureKey,
    read: (view: EditorView): EditorLocation => {
      const { state } = view;
      const { from, to } = state.selection.main;
      const selection = Cursor.getCursorFromRange(state, { from, to });
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
      pending = { id, location };
      timer ??= setTimeout(flush, REPORT_INTERVAL_MS);
    },
  };

  return [
    EditorView.domEventHandlers({
      scroll: (_event, view) => {
        view.requestMeasure(measure);
      },
    }),
    EditorView.updateListener.of((update) => {
      if (update.selectionSet || update.docChanged || update.geometryChanged) {
        update.view.requestMeasure(measure);
      }
    }),
  ];
};
