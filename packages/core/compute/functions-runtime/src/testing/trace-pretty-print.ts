//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { ConsolePrinter } from '@dxos/ai';
import { CompleteBlock } from '@dxos/assistant';
import { Process, Trace } from '@dxos/compute';
import { Database, Filter, Query } from '@dxos/echo';

import * as FeedTraceSink from '../FeedTraceSink';

/**
 * Pretty-prints assistant trace messages to stdout (CompleteBlock, process spawn/exit).
 */
export const prettyPrintTraceMessage = (message: Trace.Message): void => {
  for (const event of message.events) {
    if (Trace.isOfType(CompleteBlock, event)) {
      const tag = message.meta.processName ?? `${message.meta.pid ?? 'unknown'}`;
      console.log(`[${tag}] ${event.data.role.toUpperCase()}`);
      new ConsolePrinter({ tag }).printContentBlock(event.data.block);
    } else if (Trace.isOfType(Process.SpawnedEvent, event)) {
      console.log(`[${message.meta.pid}] Process spawned: ${message.meta.processName}`);
    } else if (Trace.isOfType(Process.ExitedEvent, event)) {
      console.log(`[${message.meta.pid}] Process exited: ${event.data.outcome}`);
    }
  }
};

/** {@link Trace.TraceSink} layer that mirrors {@link AssistantTestLayer}'s `tracing: 'pretty'` mode. */
export const traceSinkPrettyLayer = (): Layer.Layer<Trace.TraceSink> =>
  Layer.succeed(Trace.TraceSink, {
    write: prettyPrintTraceMessage,
  });

/**
 * Subscribes to the space trace feed and pretty-prints newly appended messages.
 * Returns an unsubscribe function. Requires ambient {@link Database.Service}.
 */
export const traceFeedPrettyPrintSubscription = Effect.gen(function* () {
  const feed = yield* FeedTraceSink.getOrCreateTraceFeed();
  const queryResult = yield* Database.query(Query.select(Filter.type(Trace.Message)).from(feed));
  const seen = new Set(queryResult.runSync().map((message) => message.id));

  return queryResult.subscribe((result) => {
    for (const message of result.results) {
      if (seen.has(message.id)) {
        continue;
      }
      seen.add(message.id);
      prettyPrintTraceMessage(message);
    }
  });
});
