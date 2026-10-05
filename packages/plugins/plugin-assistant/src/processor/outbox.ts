//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/reactivity/Atom';
import type * as AtomRegistry from 'effect/reactivity/AtomRegistry';

import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { type ContentBlock } from '@dxos/types';

/** How far this client got with a prompt; what the agent did with it is read from the feed. */
export type OutboxState = 'sending' | 'submitted' | 'failed';

/**
 * A prompt the reader sent from this chat, held from the moment of submit — before anything is
 * persisted — so the thread can show it at once. The thread reconciles it against the feed's queue
 * entry and the turn the agent runs from it (see `projectThread`).
 */
export type OutboxEntry = {
  /** The identity of the prompt's thread row for its whole life, so the row never remounts. */
  readonly id: string;
  readonly created: string;
  /** The prompt's content exactly as it is submitted, so the persisted copy renders the same. */
  readonly blocks: readonly ContentBlock.Any[];
  /** Feed messages that existed at submit: an identical earlier prompt is never this one's echo. */
  readonly known: ReadonlySet<string>;
  readonly state: OutboxState;
  readonly error?: Error;
};

/** Hands one prompt to the agent: resolves once the agent holds it, rejects if it never will. */
export type OutboxDispatch<T> = (payload: T) => Promise<void>;

/** A dispatch stopped before the prompt reached the agent, by the reader: the prompt is dropped, not failed. */
export class PromptCancelledError extends Error {
  constructor() {
    super('Prompt cancelled before it was sent.');
  }
}

/**
 * The prompts this client has sent, in submit order.
 *
 * Dispatches run one at a time, each waiting only until the previous prompt is in the agent's hands
 * (not for its turn): two submits racing to the agent would otherwise reach its queue in whichever
 * order their round trips landed. A failure does not hold up the prompts behind it.
 */
export class Outbox<T> {
  readonly entries = Atom.make<readonly OutboxEntry[]>([]);

  readonly #payloads = new Map<string, T>();
  #tail: Promise<void> = Promise.resolve();

  constructor(
    private readonly _registry: AtomRegistry.AtomRegistry,
    private readonly _dispatch: OutboxDispatch<T>,
  ) {}

  get(id: string): OutboxEntry | undefined {
    return this._registry.get(this.entries).find((entry) => entry.id === id);
  }

  /** Appends the prompt synchronously, then dispatches it behind any already sending. */
  add(payload: T, { blocks, known }: Pick<OutboxEntry, 'blocks' | 'known'>): OutboxEntry {
    const entry: OutboxEntry = {
      id: Obj.ID.random(),
      created: new Date().toISOString(),
      blocks,
      known,
      state: 'sending',
    };
    this.#payloads.set(entry.id, payload);
    this._registry.update(this.entries, (entries) => [...entries, entry]);
    this.#schedule(entry.id);
    return entry;
  }

  /**
   * Sends a failed prompt again. It moves to the end, since it now reaches the agent after
   * everything sent meanwhile — keeping its place would show it above prompts the agent reads first.
   */
  retry(id: string): void {
    const entry = this.get(id);
    if (entry?.state !== 'failed') {
      return;
    }

    this._registry.update(this.entries, (entries) => [
      ...entries.filter((candidate) => candidate.id !== id),
      { ...entry, state: 'sending', error: undefined },
    ]);
    this.#schedule(id);
  }

  remove(id: string): void {
    this.#payloads.delete(id);
    this._registry.update(this.entries, (entries) => entries.filter((entry) => entry.id !== id));
  }

  #schedule(id: string): void {
    this.#tail = this.#tail.then(() => this.#send(id));
  }

  async #send(id: string): Promise<void> {
    const payload = this.#payloads.get(id);
    if (payload === undefined || this.get(id)?.state !== 'sending') {
      return;
    }

    try {
      await this._dispatch(payload);
      this.#patch(id, { state: 'submitted' });
    } catch (err) {
      if (err instanceof PromptCancelledError) {
        this.remove(id);
        return;
      }

      log.warn('prompt was not sent', { error: err });
      this.#patch(id, { state: 'failed', error: err instanceof Error ? err : new Error(String(err)) });
    }
  }

  #patch(id: string, patch: Pick<OutboxEntry, 'state' | 'error'>): void {
    this._registry.update(this.entries, (entries) =>
      entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    );
  }
}
