//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { log } from '@dxos/log';

/** Sends one batch of messages to the other end: a Workers RPC call, or a plain function in-process. */
export type Send = (batch: unknown[]) => Promise<void>;

/**
 * One end of a message channel carried over function calls, since a Worker Loader isolate can be handed a function (an
 * RPC stub) but not a `MessagePort`. Batches go one call at a time, so messages keep their order. A failed send means
 * the other end went away, and closes this one.
 */
export class Port extends EventTarget implements MessagePort {
  onmessage: MessagePort['onmessage'] = null;
  onmessageerror: MessagePort['onmessageerror'] = null;
  #queue: unknown[] = [];
  #sending = false;
  #scheduled = false;
  #closed = false;

  constructor(private readonly _send: Send) {
    super();
  }

  postMessage(message: unknown): void {
    if (this.#closed) {
      return;
    }
    this.#queue.push(message);
    // Deferred, so the messages one step posts go as one batch.
    if (!this.#scheduled) {
      this.#scheduled = true;
      queueMicrotask(() => {
        this.#scheduled = false;
        this.#pump();
      });
    }
  }

  start(): void {}

  close(): void {
    this.#closed = true;
    this.#queue = [];
  }

  receive(batch: readonly unknown[]): void {
    for (const data of batch) {
      this.dispatchEvent(new MessageEvent('message', { data }));
    }
  }

  #pump(): void {
    if (this.#sending || this.#closed || this.#queue.length === 0) {
      return;
    }
    const batch = this.#queue;
    this.#queue = [];
    this.#sending = true;
    this._send(batch).then(
      () => {
        this.#sending = false;
        this.#pump();
      },
      (error: unknown) => {
        log.warn('code-mode bridge lost the other end; closing', { error, dropped: batch.length });
        this.close();
      },
    );
  }
}
