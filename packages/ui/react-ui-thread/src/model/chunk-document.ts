//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { type CleanupFn } from '@dxos/async';

import { type Chunk, type ChunkDocument, type ChunkDocumentChange, type ChunkModel } from './chunk-model';

/**
 * {@link ChunkDocument} over a CodeMirror view: both change kinds are one dispatch, since the
 * document is a rendering the user never edits directly.
 */
export class EditorChunkDocument implements ChunkDocument {
  constructor(private readonly _view: EditorView) {}

  apply(change: ChunkDocumentChange): void {
    const { state } = this._view;
    const changes =
      change.type === 'append'
        ? { from: state.doc.length, insert: change.text }
        : // Clamp: the model diffs against what it last wrote, so a host that also edits the
          // document would otherwise hand us offsets past its end.
          {
            from: Math.min(change.from, state.doc.length),
            to: Math.min(change.to, state.doc.length),
            insert: change.text,
          };

    this._view.dispatch({ changes, scrollIntoView: false });
  }
}

export type ChunkSyncOptions = {
  model: ChunkModel<any>;
  /** Keep the newest content in view while the reader is already at the foot. */
  autoScroll?: boolean;
};

/** Distance (px) from the foot within which the reader counts as "at the bottom". */
const STICKY_THRESHOLD = 32;

/**
 * Drives a {@link ChunkModel} into the editor: syncs on every model update, and once on mount so a
 * model populated before the view existed still lands.
 */
export const chunkSync = ({ model, autoScroll = true }: ChunkSyncOptions): Extension =>
  ViewPlugin.fromClass(
    class {
      readonly #document: EditorChunkDocument;
      readonly #cleanup: CleanupFn;
      #initialized = false;

      constructor(view: EditorView) {
        this.#document = new EditorChunkDocument(view);
        // A remounted editor starts empty; without this the model would diff against text that
        // belonged to the previous view and write only the difference into a blank document.
        model.rebase(view.state.doc.toString());
        this.#cleanup = model.update.on(() => {
          const { scrollDOM } = view;
          const sticky = scrollDOM.scrollHeight - scrollDOM.scrollTop - scrollDOM.clientHeight <= STICKY_THRESHOLD;
          model.sync(this.#document);
          if (autoScroll && sticky) {
            view.dispatch({ effects: EditorView.scrollIntoView(view.state.doc.length, { y: 'end' }) });
          }
        });
      }

      update(_update: ViewUpdate) {
        if (!this.#initialized) {
          this.#initialized = true;
          // Deferred: syncing inside `update` would dispatch from within an update cycle.
          queueMicrotask(() => model.sync(this.#document));
        }
      }

      destroy() {
        this.#cleanup();
      }
    },
  );

export type { Chunk };
