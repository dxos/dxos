//
// Copyright 2026 DXOS.org
//

import { type Change } from './ids.ts';

export type Outgoing = { change: Change; bytes: Uint8Array };

/**
 * Sends a tab's changes as one batch per interval, so the worker applies a burst in one Automerge call,
 * and sends whatever is queued when the page hides: a batch still waiting would not survive the page,
 * while the worker outlives it.
 */
export class BatchedSender {
  readonly #post: (batch: Outgoing[]) => void;
  readonly #intervalMs: number;
  readonly #target: EventTarget | undefined;
  #queue: Outgoing[] = [];
  #timer?: ReturnType<typeof setTimeout>;

  constructor(
    post: (batch: Outgoing[]) => void,
    { intervalMs = 100, target }: { intervalMs?: number; target?: EventTarget } = {},
  ) {
    this.#post = post;
    this.#intervalMs = intervalMs;
    this.#target = target;
    target?.addEventListener('pagehide', this.flush);
  }

  get queued(): number {
    return this.#queue.length;
  }

  /** A `TabDoc`'s `send`. */
  readonly send = (change: Change, bytes: Uint8Array): void => {
    this.#queue.push({ change, bytes });
    this.#timer ??= setTimeout(this.flush, this.#intervalMs);
  };

  readonly flush = (): void => {
    clearTimeout(this.#timer);
    this.#timer = undefined;
    if (this.#queue.length > 0) {
      this.#post(this.#queue.splice(0));
    }
  };

  close(): void {
    this.flush();
    this.#target?.removeEventListener('pagehide', this.flush);
  }
}
