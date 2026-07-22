//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';

import { CompleteBlock } from '@dxos/assistant';
import { Trace } from '@dxos/compute';
import { FeedTraceSink } from '@dxos/compute-runtime';
import { Database, Filter, Query, type Type } from '@dxos/echo';
import { type ContentBlock } from '@dxos/types';

/**
 * Deterministic DB-state assertion for a Scorer to check (TESTING.md dimension G) — real DB
 * state, not the agent's self-reported completion.
 */
export const objectExists = <T extends Type.AnyEntity>(
  type: T,
  predicate: (obj: Type.InstanceType<T>) => boolean,
): Effect.Effect<boolean, never, Database.Service> =>
  Effect.gen(function* () {
    const { db } = yield* Database.Service;
    const results = yield* Effect.promise(() => db.query(Filter.type(type)).run());
    return results.some(predicate);
  });

/** Same lookup as `objectExists`, but returns the matching object (or `undefined`) for further inspection. */
export const findObject = <T extends Type.AnyEntity>(
  type: T,
  predicate: (obj: Type.InstanceType<T>) => boolean,
): Effect.Effect<Type.InstanceType<T> | undefined, never, Database.Service> =>
  Effect.gen(function* () {
    const { db } = yield* Database.Service;
    const results = yield* Effect.promise(() => db.query(Filter.type(type)).run());
    return results.find(predicate);
  });

/**
 * Every `CompleteBlock` event written to the space's trace feed during the run, in order —
 * the raw substrate for deterministic tool-invocation / transcript assertions (TESTING.md
 * dimension G), read from the durable feed rather than trusting the agent's own report.
 */
export const completedBlocks = (): Effect.Effect<
  { role: string; block: ContentBlock.Any }[],
  unknown,
  Database.Service
> =>
  Effect.gen(function* () {
    // `FeedTraceSink`'s writes are buffered and flushed on a forked fiber; there's no handle here
    // on the already-running sink instance to flush directly, so give the last writes a moment.
    yield* Effect.sleep(Duration.millis(300));

    const feed = yield* FeedTraceSink.getOrCreateTraceFeed();
    const messages = yield* Database.query(Query.select(Filter.type(Trace.Message)).from(feed)).run;

    const blocks: { role: string; block: ContentBlock.Any }[] = [];
    for (const message of messages) {
      for (const event of message.events) {
        if (Trace.isOfType(CompleteBlock, event)) {
          blocks.push({ role: event.data.role, block: event.data.block });
        }
      }
    }
    return blocks;
  });

export interface ToolInvocation {
  readonly name: string;
  readonly input: string;
  readonly result?: unknown;
  readonly error?: string;
}

/** Pairs `toolCall`/`toolResult` blocks (by `toolCallId`) from {@link completedBlocks}. */
export const toolInvocations = (): Effect.Effect<ToolInvocation[], unknown, Database.Service> =>
  Effect.gen(function* () {
    const blocks = yield* completedBlocks();
    const calls = new Map<string, { name: string; input: string }>();
    const invocations: ToolInvocation[] = [];
    for (const { block } of blocks) {
      if (block._tag === 'toolCall') {
        calls.set(block.toolCallId, { name: block.name, input: block.input });
      } else if (block._tag === 'toolResult') {
        const call = calls.get(block.toolCallId);
        invocations.push({
          name: call?.name ?? block.name,
          input: call?.input ?? '',
          result: block.result,
          error: block.error,
        });
      }
    }
    return invocations;
  });
