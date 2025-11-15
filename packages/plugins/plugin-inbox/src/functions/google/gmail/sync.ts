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
import { DXN } from '@dxos/echo';
import type { Queue } from '@dxos/echo-db';
import { DatabaseService, QueueService, defineFunction } from '@dxos/functions';
import { log } from '@dxos/log';
import { type Message } from '@dxos/types';

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
  services: [DatabaseService, QueueService],
  handler: ({
    // TODO(wittjosiah): Schema-based defaults are not yet supported.
    data: { mailboxId, userId = 'me', after = format(subDays(new Date(), 30), 'yyyy-MM-dd') },
  }) =>
    Effect.gen(function* () {
      log('syncing gmail', { mailboxId, userId, after });

      const mailbox = yield* DatabaseService.resolve(DXN.parse(mailboxId), Mailbox.Mailbox);

      // TODO(wittjosiah): Consider syncing labels to space.
      // Sync labels.
      // const { labels } = yield* listLabels(userId);
      // labels.forEach((label) => {
      //   (mailbox.tags ??= {})[label.id] = { label: label.name };
      // });

      const queue = yield* QueueService.getQueue<Message.Message>(mailbox.queue.dxn);

      // Get last message to resume from.
      const objects = yield* Effect.tryPromise(() => queue.queryObjects());
      const lastMessage = objects.at(-1);

      const startDate = lastMessage ? new Date(lastMessage.created) : new Date(after);

      log('starting sync', {
        startDate: format(startDate, 'yyyy-MM-dd'),
        lastMessageId: lastMessage?.id,
      });

      // Stream messages oldest-first into queue.
      const newMessagesCount = yield* streamGmailMessagesToQueue(startDate, queue, userId, lastMessage);

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
 * Generates date ranges from oldest to newest.
 */
const generateDateRanges = (config: DateRangeConfig): Stream.Stream<DateChunk> => {
  return Stream.unfoldChunkEffect(config.startDate, (currentStart) =>
    Effect.gen(function* () {
      if (currentStart >= config.endDate) {
        return Option.none();
      }

      const chunkEnd = addDays(currentStart, config.chunkDays);
      const actualEnd = chunkEnd > config.endDate ? config.endDate : chunkEnd;

      const chunk: DateChunk = {
        start: currentStart,
        end: actualEnd,
      };

      log('processing date chunk', {
        start: format(chunk.start, 'yyyy-MM-dd'),
        end: format(chunk.end, 'yyyy-MM-dd'),
      });

      return Option.some([Chunk.of(chunk), actualEnd]);
    }),
  );
};

/**
 * Fetches message IDs for a specific date range, returning them from oldest to newest.
 */
const fetchMessagesForDateRange = (userId: string, dateChunk: DateChunk) => {
  return Stream.unfoldChunkEffect({ pageToken: Option.none<string>(), done: false }, (state) =>
    Effect.gen(function* () {
      if (state.done) {
        return Option.none();
      }

      // Build query for date range.
      const query = `in:inbox after:${format(dateChunk.start, 'yyyy/MM/dd')} before:${format(dateChunk.end, 'yyyy/MM/dd')}`;

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
      const messageIds = (messages || []).map((m) => m.id).reverse();

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
  lastMessage?: Message.Message,
) {
  const config: DateRangeConfig = {
    startDate: lastMessage ? new Date(lastMessage.created) : startDate,
    endDate: new Date(),
    chunkDays: STREAMING_CONFIG.dateChunkDays,
  };

  const count = yield* Function.pipe(
    generateDateRanges(config),
    // Sequential date range processing to maintain chronological order.
    Stream.flatMap((dateChunk) => fetchMessagesForDateRange(userId, dateChunk), { concurrency: 1 }),
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
    Stream.mapEffect((gmailMessage) => mapMessage(lastMessage)(gmailMessage)),
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
