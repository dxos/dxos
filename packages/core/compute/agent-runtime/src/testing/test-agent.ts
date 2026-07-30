//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Scope from 'effect/Scope';
import * as Stream from 'effect/Stream';

import { CompleteBlock, PartialBlock } from '@dxos/assistant';
import { type AgentService, Trace } from '@dxos/compute';
import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { Message } from '@dxos/types';

/**
 * Buffered view of a session's ephemeral block events — the headless equivalent of what the chat
 * UI renders while a request streams.
 */
export interface EphemeralCollector {
  /** Snapshot of `PartialBlock` payloads observed so far, in arrival order. */
  partialBlocks: () => readonly Trace.PayloadType<typeof PartialBlock>[];
  /** Snapshot of `CompleteBlock` payloads observed so far, in arrival order. */
  completeBlocks: () => readonly Trace.PayloadType<typeof CompleteBlock>[];
}

/**
 * Forks a collector over {@link AgentService.Session.subscribeEphemeral} so a test can assert the
 * streaming path (partial → complete blocks) without a UI. The fork is scoped: use with
 * `it.scoped` (or an explicit scope) so the subscription is interrupted on test close.
 */
export const collectEphemeral = (
  session: AgentService.Session,
): Effect.Effect<EphemeralCollector, never, Scope.Scope> =>
  Effect.gen(function* () {
    const partial: Trace.PayloadType<typeof PartialBlock>[] = [];
    const complete: Trace.PayloadType<typeof CompleteBlock>[] = [];
    yield* session.subscribeEphemeral().pipe(
      Stream.runForEach((message) =>
        Effect.sync(() => {
          for (const event of message.events) {
            if (Trace.isOfType(PartialBlock, event)) {
              partial.push(event.data);
            } else if (Trace.isOfType(CompleteBlock, event)) {
              complete.push(event.data);
            }
          }
        }),
      ),
      Effect.forkScoped,
    );

    return {
      partialBlocks: () => [...partial],
      completeBlocks: () => [...complete],
    };
  });

export interface WaitForMessageOptions {
  /** Overall deadline in milliseconds. @default 10_000 */
  timeout?: number;
  /** Poll interval in milliseconds. @default 100 */
  interval?: number;
}

/**
 * Polls the conversation feed until a message matches. Covers the gap left by
 * `Session.waitForCompletion`, which settles when the *turn* completes — background sub-agents
 * report back later, out of band. Polls on the real clock (not the Effect `TestClock`), so it works
 * under `it.effect` and `it.scoped` alike.
 */
export const waitForMessage = (
  feed: Feed.Feed,
  predicate: (message: Message.Message) => boolean,
  { timeout = 10_000, interval = 100 }: WaitForMessageOptions = {},
): Effect.Effect<Message.Message, Error, Database.Service> =>
  Effect.gen(function* () {
    const deadline = Date.now() + timeout;
    do {
      const items = yield* Feed.query(feed, Filter.type(Message.Message)).run;
      const match = items.filter(Obj.instanceOf(Message.Message)).find(predicate);
      if (match) {
        return match;
      }
      yield* Effect.promise(() => new Promise((resolve) => setTimeout(resolve, interval)));
    } while (Date.now() < deadline);

    return yield* Effect.fail(new Error(`Timed out after ${timeout}ms waiting for a matching feed message.`));
  });

/** Convenience predicate: any block's text content contains the substring. */
export const messageTextIncludes =
  (needle: string) =>
  (message: Message.Message): boolean =>
    Message.extractText(message).includes(needle);
