//
// Copyright 2023 DXOS.org
// Copyright 2024 Automerge
// Ref: https://github.com/automerge/automerge-codemirror
//

import { next as A, type Heads } from '@automerge/automerge';
import { type EditorState, type StateField } from '@codemirror/state';
import { type EditorView } from '@codemirror/view';

import { Doc } from '@dxos/echo-doc';
import { log } from '@dxos/log';

import { type State, getLastHeads, getPath, isReconcile, reconcileAnnotation, updateHeads } from './defs.ts';
import { updateAutomerge } from './update-automerge.ts';
import { updateCodeMirror } from './update-codemirror.ts';

export type SyncerOptions = {
  /** Quiet period after the last keystroke before a typing burst is written as one change. */
  idleMs?: number;
  /** Longest a keystroke waits to be written, so other peers see a long burst as it goes. */
  maxDelayMs?: number;
};

const DEFAULT_IDLE_MS = 300;
const DEFAULT_MAX_DELAY_MS = 1_000;

/**
 * Implements three-way merge between the editor and the document.
 *
 * Local edits are written in bursts, one Automerge change per burst, since every change costs history
 * in each realm holding the document. Anything that needs the document to match the editor writes
 * the pending edits first: a remote change, a cursor conversion ({@link flushForRead}), unmount.
 */
export class Syncer {
  private _pending = false;
  readonly #idleMs: number;
  readonly #maxDelayMs: number;
  #view?: EditorView;
  /**
   * The last editor state carrying this syncer's field. A reconfiguration that drops the extension
   * replaces the view's state before the plugin is destroyed, so unmount writes from this one.
   */
  #lastState?: EditorState;
  #timer?: ReturnType<typeof setTimeout>;
  #burstStartedAt?: number;
  /**
   * Local transactions already written to the document whose heads the editor state has not taken
   * yet: the first `count` unreconciled transactions, which produced `heads`.
   */
  #written?: { heads: Heads; count: number };
  #commitQueued = false;
  #reconcileQueued = false;

  constructor(
    private readonly _handle: Doc.Handle,
    private readonly _state: StateField<State>,
    { idleMs = DEFAULT_IDLE_MS, maxDelayMs = DEFAULT_MAX_DELAY_MS }: SyncerOptions = {},
  ) {
    this.#idleMs = idleMs;
    this.#maxDelayMs = maxDelayMs;
  }

  attach(view: EditorView): void {
    this.#view = view;
    this.#lastState = view.state;
  }

  /** Called with every state the view moves to while this binding is part of it. */
  track(state: EditorState): void {
    this.#lastState = state;
  }

  reconcile(view: EditorView, editor: boolean): void {
    if (this._pending) {
      return;
    }

    this.#view = view;
    if (editor) {
      this.#schedule();
      return;
    }

    // The diff starts from the editor's heads, so pending local edits must be written first; the
    // change that brought us here may still be open (a local writer), so that waits for a microtask.
    if (this.#timer !== undefined || this.#written) {
      if (!this.#reconcileQueued) {
        this.#reconcileQueued = true;
        queueMicrotask(() => {
          this.#reconcileQueued = false;
          this.#reconcileDocument(view);
        });
      }
      return;
    }

    this.#reconcileDocument(view);
  }

  /** Writes and commits pending local edits now. */
  flush(): void {
    if (this.#view) {
      this.#commit(this.#view);
    }
  }

  /**
   * Writes pending local edits so the document matches the editor, for a read that may run inside an
   * editor update (where dispatching is not allowed); the heads reach the editor state in a microtask.
   */
  flushForRead(): void {
    const view = this.#view;
    if (!view || !this.#write(view.state) || this.#commitQueued) {
      return;
    }

    this.#commitQueued = true;
    queueMicrotask(() => {
      this.#commitQueued = false;
      this.#commit(view);
    });
  }

  /** Writes pending local edits without dispatching, for a view that is going away. */
  detach(): void {
    const view = this.#view;
    const state = view?.state.field(this._state, false) ? view.state : this.#lastState;
    if (state) {
      this.#write(state);
    }
    this.#clearTimer();
    this.#view = undefined;
    this.#lastState = undefined;
    this.#written = undefined;
  }

  #reconcileDocument(view: EditorView): void {
    if (this.#view !== view) {
      return;
    }

    this._pending = true;
    try {
      this.#commit(view);
      this.onAutomergeChange(view);
    } finally {
      this._pending = false;
    }
  }

  #schedule(): void {
    const now = Date.now();
    this.#burstStartedAt ??= now;
    this.#clearTimer(false);
    const delay = Math.max(0, Math.min(this.#idleMs, this.#burstStartedAt + this.#maxDelayMs - now));
    this.#timer = setTimeout(() => this.flush(), delay);
  }

  #clearTimer(endBurst = true): void {
    if (this.#timer !== undefined) {
      clearTimeout(this.#timer);
      this.#timer = undefined;
    }
    if (endBurst) {
      this.#burstStartedAt = undefined;
    }
  }

  /** Writes and hands the resulting heads to the editor state, which clears its unreconciled list. */
  #commit(view: EditorView): void {
    this.#clearTimer();
    // A reconfiguration can remove the binding while a microtask that commits is still queued.
    if (!view.state.field(this._state, false)) {
      return;
    }
    this.#write(view.state);
    const written = this.#written;
    if (written) {
      this.#written = undefined;
      view.dispatch({
        effects: updateHeads(written.heads),
        annotations: reconcileAnnotation.of(false),
      });
    }
  }

  /**
   * Applies the unreconciled transactions not yet written to the document.
   * @returns Whether anything is written and not yet committed.
   */
  #write(state: EditorState): boolean {
    const field = state.field(this._state, false);
    if (!field) {
      return false;
    }
    log('write local edits');
    const transactions = field.unreconciledTransactions.filter((tx) => !isReconcile(tx));
    const skip = this.#written?.count ?? 0;
    const unwritten = transactions.slice(skip);
    if (unwritten.length > 0) {
      const wasPending = this._pending;
      // Our own write echoes back as a document change, which must not reconcile against itself.
      this._pending = true;
      try {
        const heads = updateAutomerge(
          this._state,
          this._handle,
          unwritten,
          state,
          this.#written?.heads ?? getLastHeads(state, this._state),
        );
        if (heads) {
          this.#written = { heads, count: transactions.length };
        } else if (this.#written) {
          this.#written = { ...this.#written, count: transactions.length };
        }
      } finally {
        this._pending = wasPending;
      }
    }

    return this.#written !== undefined;
  }

  private onAutomergeChange(view: EditorView): void {
    log('onAutomergeChange');

    // Get the diff between the updated state of the document and the heads and apply that to the codemirror doc.
    const oldHeads = getLastHeads(view.state, this._state);
    const newHeads = A.getHeads(this._handle.doc()!);
    const diff = A.equals(oldHeads, newHeads) ? [] : A.diff(this._handle.doc()!, oldHeads, newHeads);

    const selection = view.state.selection;
    const path = getPath(view.state, this._state);
    updateCodeMirror(view, selection, path, diff);

    // TODO(burdon): Test conflicts?
    // A.getConflicts(this._handle.doc()!, path[0]);

    view.dispatch({
      effects: updateHeads(newHeads),
      annotations: reconcileAnnotation.of(false),
    });
  }
}
