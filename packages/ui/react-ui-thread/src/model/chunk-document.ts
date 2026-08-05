//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { EditorView, ViewPlugin } from '@codemirror/view';

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

      constructor(view: EditorView) {
        this.#document = new EditorChunkDocument(view);
        this.#cleanup = model.update.on(() => {
          const { scrollDOM } = view;
          const sticky = scrollDOM.scrollHeight - scrollDOM.scrollTop - scrollDOM.clientHeight <= STICKY_THRESHOLD;
          model.sync(this.#document);
          if (autoScroll && sticky) {
            view.dispatch({ effects: EditorView.scrollIntoView(view.state.doc.length, { y: 'end' }) });
          }
        });

        // Whatever the model already holds, written on mount. Deferred because a dispatch cannot
        // happen while the view is still being constructed.
        //
        // The rebase is here rather than in the constructor, and the pair is deliberately atomic: a
        // component can build several views before the visible one settles (a changed dependency,
        // a StrictMode double-mount), and they all drive the same model. Rebasing at construction
        // time lets an earlier view's deferred sync advance the shared baseline first, after which
        // the model believes it has already written and the view that is actually on screen stays
        // empty. Declaring what *this* view holds immediately before writing to it cannot race.
        queueMicrotask(() => {
          model.rebase(view.state.doc.toString());
          model.sync(this.#document);
        });
      }

      destroy() {
        this.#cleanup();
      }
    },
  );

export type { Chunk };
