//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { addDays, format, subDays } from 'date-fns';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import { ArtifactId } from '@dxos/assistant';
import { DXN, Obj } from '@dxos/echo';
import { Database } from '@dxos/echo';
import type { Queue } from '@dxos/echo-db';
import { QueueService, defineFunction } from '@dxos/functions';
import { log } from '@dxos/log';
import { type Message } from '@dxos/types';

// NOTE: While the integration is in test mode, only the emails listed in the following dashboard are supported:
//   https://console.cloud.google.com/auth/audience?authuser=1&project=composer-app-454920

// TODO(burdon): Importing from types/index.ts pulls in @dxos/client dependencies due to SpaceSchema.
import * as Mailbox from '../../../types/Mailbox';
import { GoogleMail } from '../../apis';

import { mapMessage } from './mapper';

type DateChunk = {
  readonly start: Date;
  readonly end: Date;
};

type DateRangeConfig = {
  readonly startDate: Date;
  readonly endDate: Date;
  readonly chunkDays: number;
};

const STREAMING_CONFIG = {
  dateChunkDays: 7, // Days per date chunk.
  messageFetchConcurrency: 5, // Parallel message fetches.
  bufferSize: 10, // In-flight message buffer.
  queueBatchSize: 10, // Messages per queue append.
  maxResults: 500, // Gmail API page size.
} as const;

export default defineFunction({
  key: 'dxos.org/function/inbox/google-mail-sync',
  name: 'Sync Gmail',
  description: 'Sync emails from Gmail to the mailbox.',
  inputSchema: Schema.Struct({
    mailboxId: ArtifactId,
    userId: Schema.String.pipe(Schema.optional),
    label: Schema.String.pipe(
      Schema.annotations({
        description: 'Gmail label to sync emails from. Defaults to inbox.',
      }),
      Schema.optional,
    ),
    after: Schema.Union(Schema.Number, Schema.String).pipe(
      Schema.annotations({
        description: 'Date to start syncing from, either a unix timestamp or yyyy-MM-dd string.',
      }),
      Schema.optional,
    ),
  }),
  outputSchema: Schema.Struct({
    newMessages: Schema.Number,
  }),
  types: [Mailbox.Mailbox],
  services: [Database.Service, QueueService],
  handler: ({
    // TODO(wittjosiah): Schema-based defaults are not yet supported.
    data: { mailboxId, userId = 'me', label = 'inbox', after = format(subDays(new Date(), 30), 'yyyy-MM-dd') },
  }) =>
    Effect.gen(function* () {
      log('syncing gmail', { mailboxId, userId, after });
      const mailbox = yield* Database.Service.resolve(DXN.parse(mailboxId), Mailbox.Mailbox);

      const labelCount = yield* syncLabels(mailbox, userId).pipe(
        Effect.catchAll((error) => {
          log.catch(error);
          return Effect.succeed(0);
        }),
      );
      log('synced labels', { count: labelCount });

      const queue = yield* QueueService.getQueue<Message.Message>(mailbox.queue.dxn);

      // Get last message to resume from.
      const objects = yield* Effect.tryPromise(() => queue.queryObjects());
      const lastMessage = objects.at(-1);

      // Build deduplication set from recent messages to prevent duplicates across sync runs.
      const recentMessages = objects.slice(-STREAMING_CONFIG.maxResults);
      const existingGmailIds = new Set(
        recentMessages.flatMap((msg) => {
          const meta = Obj.getMeta(msg);
          return meta.keys.filter((key) => key.source === 'gmail.com').map((key) => key.id);
        }),
      );

      const startDate = lastMessage ? new Date(lastMessage.created) : new Date(after);

      log('starting sync', {
        startDate: format(startDate, 'yyyy-MM-dd'),
        lastMessageId: lastMessage?.id,
        existingGmailIds: existingGmailIds.size,
      });

      // Stream messages oldest-first into queue.
      const newMessagesCount = yield* streamGmailMessagesToQueue(startDate, queue, userId, label, existingGmailIds);
      log('sync complete', { newMessages: newMessagesCount });

      return {
        newMessages: newMessagesCount,
      };
    }).pipe(Effect.provide(FetchHttpClient.layer)),
});

//
// Helper functions.
//

/**
 * Sync labels.
 */
const syncLabels = Effect.fn(function* (mailbox: Mailbox.Mailbox, userId: string) {
  const { labels } = yield* GoogleMail.listLabels(userId);
  labels.forEach((label) => {
    (mailbox.labels ??= {})[label.id] = label.name;
  });
  return labels.length;
});

/**
 * Generates date ranges from oldest to newest.
 */
const generateDateRanges = (config: DateRangeConfig): Stream.Stream<DateChunk> => {
  return Stream.unfoldChunkEffect(config.startDate, (currentStart) =>
    Effect.gen(function* () {
      if (currentStart >= config.endDate) {
        return Option.none();
      }

      // Gmail's 'after:' is inclusive and 'before:' is exclusive, so add 1 day to chunkEnd.
      const chunkEnd = addDays(currentStart, config.chunkDays + 1);
      const actualEnd = chunkEnd > config.endDate ? config.endDate : chunkEnd;

      const chunk: DateChunk = {
        start: currentStart,
        end: actualEnd,
      };

      log('processing date chunk', {
        start: format(chunk.start, 'yyyy-MM-dd'),
        end: format(chunk.end, 'yyyy-MM-dd'),
      });

      // Advance to the next day after actualEnd to avoid overlap between chunks.
      const nextStart = addDays(actualEnd, 1);
      return Option.some([Chunk.of(chunk), nextStart]);
    }),
  );
};

/**
 * Fetches message IDs for a specific date range, returning them from oldest to newest.
 */
const fetchMessagesForDateRange = (userId: string, label: string, dateChunk: DateChunk) => {
  return Stream.unfoldChunkEffect({ pageToken: Option.none<string>(), done: false }, (state) =>
    Effect.gen(function* () {
      if (state.done) {
        return Option.none();
      }

      // Build query for date range.
      const query = `in:anywhere label:${label} after:${format(dateChunk.start, 'yyyy/MM/dd')} before:${format(dateChunk.end, 'yyyy/MM/dd')}`;

      log('fetching message IDs', {
        query,
        pageToken: Option.getOrUndefined(state.pageToken),
      });

      const { messages, nextPageToken } = yield* GoogleMail.listMessages(
        userId,
        query,
        STREAMING_CONFIG.maxResults,
        Option.getOrUndefined(state.pageToken),
      );

      // Messages come newest-first from Gmail, reverse to get oldest-first.
      const messageIds = (messages ?? []).map((m) => m.id).reverse();

      const nextState = {
        pageToken: Option.fromNullable(nextPageToken),
        done: !nextPageToken,
      };

      return Option.some([Chunk.fromIterable(messageIds), nextState]);
    }),
  );
};

/**
 * Streams Gmail messages from oldest to newest into a DXOS queue.
 */
const streamGmailMessagesToQueue = Effect.fn(function* (
  startDate: Date,
  queue: Queue<Message.Message>,
  userId: string,
  label: string,
  existingGmailIds: Set<string>,
) {
  const config: DateRangeConfig = {
    startDate,
    // Add 1 day to endDate to ensure messages from today are included.
    endDate: addDays(new Date(), 1),
    chunkDays: STREAMING_CONFIG.dateChunkDays,
  };

  const count = yield* Function.pipe(
    generateDateRanges(config),
    // Sequential date range processing to maintain chronological order.
    Stream.flatMap((dateChunk) => fetchMessagesForDateRange(userId, label, dateChunk), { concurrency: 1 }),
    // Filter out message IDs that already exist in queue.
    Stream.filter((messageId) => {
      const isDuplicate = existingGmailIds.has(messageId);
      if (isDuplicate) {
        log('skipping duplicate message', { messageId });
      }
      return !isDuplicate;
    }),
    // Parallel message fetching with bounded buffer.
    Stream.flatMap(
      (messageId) =>
        Effect.gen(function* () {
          log('fetching message', { messageId });
          return yield* GoogleMail.getMessage(userId, messageId);
        }),
      {
        concurrency: STREAMING_CONFIG.messageFetchConcurrency,
        bufferSize: STREAMING_CONFIG.bufferSize,
      },
    ),
    // Convert to Message.Message objects.
    Stream.mapEffect((message) => mapMessage(message)),
    Stream.filter(Predicate.isNotNullable),
    // Batch messages for queue append.
    Stream.grouped(STREAMING_CONFIG.queueBatchSize),
    // Append batches to DXOS queue.
    Stream.mapEffect((batch) =>
      Effect.gen(function* () {
        const messages = Chunk.toArray(batch);
        log('appending batch to queue', {
          count: messages.length,
        });
        yield* Effect.tryPromise(() => queue.append(messages));
        return messages.length;
      }),
    ),
    // Sum up total count of messages.
    Stream.runFold(0, (acc, count) => acc + count),
  );

  return count;
});
