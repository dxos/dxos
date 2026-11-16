//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Feed, Obj } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import { type ContentBlock, Message } from '@dxos/types';

/** Where a segment is appended: a meeting's transcript feed and the database that holds it. */
export type TranscriptTarget = { db: Database.Database; feed: Feed.Feed };

/** A step applied to each message before it is appended, such as entity linking; it may return the message as is. */
export type TranscriptStage = (message: Message.Message) => Promise<Message.Message>;

export type TranscriptSinkOptions = {
  /** Resolves the target at write time, so a segment spoken before the meeting was selected still finds its feed. */
  resolveTarget: () => Promise<TranscriptTarget | undefined>;
  /** Applied in order to every message. */
  stages?: readonly TranscriptStage[];
};

/**
 * Writes transcript segments into a meeting's feed as `Message`s: source → stages → append.
 *
 * Every source (a live call, a simulated call) writes through one sink, and writes are queued: a
 * stage that takes longer for one segment than for the next must not reorder an append-only feed.
 */
export class TranscriptSink {
  #queue: Promise<void> = Promise.resolve();

  constructor(private readonly _options: TranscriptSinkOptions) {}

  /** Queues a segment; resolves once it is appended, or dropped for want of a target. */
  write(block: ContentBlock.Transcript, sender: Message.Message['sender']): Promise<void> {
    const written = this.#queue.then(() => this.#append(block, sender));
    this.#queue = written.catch((error) => log.catch(error));
    return written;
  }

  /** Resolves once every segment queued so far is written. */
  async flush(): Promise<void> {
    await this.#queue;
  }

  async #append(block: ContentBlock.Transcript, sender: Message.Message['sender']): Promise<void> {
    const target = await this._options.resolveTarget();
    if (!target) {
      log.info('transcript segment dropped: no meeting to write it to');
      return;
    }

    let message = Obj.make(Message.Message, { created: new Date().toISOString(), blocks: [block], sender });
    for (const stage of this._options.stages ?? []) {
      message = await stage(message);
    }
    await Feed.append(target.feed, [message]).pipe(
      Effect.provide(Database.layer(target.db)),
      EffectEx.runAndForwardErrors,
    );
  }
}
