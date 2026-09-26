//
// Copyright 2026 DXOS.org
//

import { UpdateScheduler } from '@dxos/async';
import { Context } from '@dxos/context';

import { type Change } from './ids.ts';

export type Outgoing = { change: Change; bytes: Uint8Array };

/** RepoProxy's limit, so the worker receives a tab document's changes when it receives a replica's. */
const MAX_SENDS_PER_SECOND = 10;

/**
 * Sends a tab's changes on RepoProxy's schedule: the first change after a pause at once, then at most
 * one batch per 100 ms, which the worker applies in one Automerge call. Whatever is queued goes when
 * the page hides, since a batch waiting for its slot would not survive the page.
 */
export class BatchedSender {
  readonly #post: (batch: Outgoing[]) => void;
  readonly #target: EventTarget | undefined;
  readonly #ctx = new Context();
  readonly #scheduler: UpdateScheduler;
  #queue: Outgoing[] = [];

  constructor(post: (batch: Outgoing[]) => void, { target }: { target?: EventTarget } = {}) {
    this.#post = post;
    this.#target = target;
    this.#scheduler = new UpdateScheduler(this.#ctx, async () => this.flush(), {
      maxFrequency: MAX_SENDS_PER_SECOND,
    });
    target?.addEventListener('pagehide', this.flush);
  }

  get queued(): number {
    return this.#queue.length;
  }

  /** A `TabDoc`'s `send`. */
  readonly send = (change: Change, bytes: Uint8Array): void => {
    this.#queue.push({ change, bytes });
    this.#scheduler.trigger();
  };

  /** Sends what is queued now. */
  readonly flush = (): void => {
    if (this.#queue.length > 0) {
      this.#post(this.#queue.splice(0));
    }
  };

  /** Stops sending; what is still queued is dropped, as it is when a page goes without `pagehide`. */
  async close(): Promise<void> {
    this.#target?.removeEventListener('pagehide', this.flush);
    await this.#ctx.dispose();
  }
}
