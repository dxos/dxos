//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { log } from '@dxos/log';

/** Sends one batch of messages to the other end: a Workers RPC call, or a plain function in-process. */
export type Send = (batch: unknown[]) => Promise<void>;

/** One end of a channel whose messages travel as {@link Send} calls. */
export type End = {
  /** What the worker protocol drives, as it would drive a `MessagePort`. */
  readonly port: MessagePort;
  /** Delivers a batch the other end sent, as `message` events on {@link port}. */
  readonly receive: (batch: readonly unknown[]) => void;
};

/**
 * One end of a message channel carried over function calls rather than a real `MessagePort`.
 *
 * A Worker Loader isolate cannot be handed a port, but it can be handed a function, which crosses as an RPC stub. Each
 * end sends in batches with one call in flight, so messages arrive in the order they were posted whatever the transport
 * does with concurrent calls, and a burst costs one round trip rather than one per message.
 *
 * A failed send closes this end: the channel's only failure mode is the other side going away, which the sandbox
 * learns about separately.
 */
export const makeEnd = (send: Send): End => {
  const port = new BridgePort(send);
  return { port, receive: (batch) => port.receive(batch) };
};

/**
 * Shaped as `MessagePort` for the worker protocol's client and runner, which only post and listen for `message`. The
 * events it dispatches are real `MessageEvent`s, so listeners read `event.data` as from a port.
 */
class BridgePort extends EventTarget implements MessagePort {
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
    // Deferred to the end of the current task, so the messages one step posts go as one batch.
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
