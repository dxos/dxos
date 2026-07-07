//
// Copyright 2026 DXOS.org
//

/**
 * Transport-agnostic message channel. Production adapters wrap window
 * CustomEvents / chrome.runtime; tests use `createLoopback`.
 */
export interface Channel {
  send(message: unknown): void;
  subscribe(handler: (message: unknown) => void): () => void;
}

/** In-memory channel: messages sent here are delivered to its peer's subscribers. */
class LoopbackChannel implements Channel {
  #peer!: LoopbackChannel;
  readonly #handlers = new Set<(message: unknown) => void>();

  _link(peer: LoopbackChannel): void {
    this.#peer = peer;
  }

  send(message: unknown): void {
    // Deliver asynchronously to model real transports (no synchronous re-entrancy).
    const handlers = [...this.#peer.#handlers];
    queueMicrotask(() => handlers.forEach((handler) => handler(message)));
  }

  subscribe(handler: (message: unknown) => void): () => void {
    this.#handlers.add(handler);
    return () => this.#handlers.delete(handler);
  }
}

/** Create a wired pair of in-memory channels. */
export const createLoopback = (): [Channel, Channel] => {
  const a = new LoopbackChannel();
  const b = new LoopbackChannel();
  a._link(b);
  b._link(a);
  return [a, b];
};
