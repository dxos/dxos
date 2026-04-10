//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { addDays, format, subDays } from 'date-fns';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';
import * as Stream from 'effect/Stream';

import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { Message } from '@dxos/types';

import { GoogleMail } from '../../../apis';
import { InboxResolver, GoogleCredentials } from '../../../services';
import { Mailbox } from '../../../types';
import { GoogleMailSync } from '../../definitions';
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
  dateChunkDays: 7,
  messageFetchConcurrency: 5,
  bufferSize: 10,
  queueBatchSize: 10,
  maxResults: 500,
  restrictedMax: 20,
} as const;

export default GoogleMailSync.pipe(
  Operation.withHandler(
    ({
      mailbox: mailboxRef,
      userId = 'me',
      label = 'inbox',
      after = format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      restrictedMode = false,
    }) =>
      Effect.gen(function* () {
        log('syncing gmail', { mailbox: mailboxRef.dxn.toString(), userId, after, restrictedMode });
        const mailbox = yield* Database.load(mailboxRef);
        const feed = yield* Database.load(mailbox.feed);

        const labelCount = yield* syncLabels(mailbox, userId).pipe(
          Effect.catchAll((error) => {
            log.catch(error);
            return Effect.succeed(0);
          }),
        );
        log('synced labels', { count: labelCount });

        const objects = yield* Feed.runQuery(feed, Filter.type(Message.Message));
        const lastMessage = objects.at(-1);

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

        const newMessagesCount = yield* streamGmailMessagesToFeed(
          startDate,
          feed,
          userId,
          label,
          existingGmailIds,
          restrictedMode,
        );
        log('sync complete', { newMessages: newMessagesCount });
        return {
          newMessages: newMessagesCount,
        };
      }).pipe(
        Effect.provide(
          Layer.mergeAll(FetchHttpClient.layer, InboxResolver.Live, GoogleCredentials.fromMailbox(mailboxRef)),
        ),
      ),
  ),
);

const syncLabels = Effect.fn(function* (mailbox: Mailbox.Mailbox, userId: string) {
  const { labels } = yield* GoogleMail.listLabels(userId);
  Obj.change(mailbox, (mailbox) => {
    labels.forEach((label) => {
      (mailbox.labels ??= {})[label.id] = label.name;
    });
  });
  return labels.length;
});

const generateDateRanges = (config: DateRangeConfig): Stream.Stream<DateChunk> => {
  return Stream.unfoldChunkEffect(config.startDate, (currentStart) =>
    Effect.gen(function* () {
      if (currentStart >= config.endDate) {
        return Option.none();
      }

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

      const nextStart = addDays(actualEnd, 1);
      return Option.some([Chunk.of(chunk), nextStart]);
    }),
  );
};

const fetchMessagesForDateRange = (userId: string, label: string, dateChunk: DateChunk) => {
  return Stream.unfoldChunkEffect({ pageToken: Option.none<string>(), done: false }, (state) =>
    Effect.gen(function* () {
      if (state.done) {
        return Option.none();
      }

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

      log('fetched message IDs', {
        count: messages?.length ?? 0,
        done: !nextPageToken,
      });

      const messageIds = (messages ?? []).map((m) => m.id).reverse();
      const nextState = {
        pageToken: Option.fromNullable(nextPageToken),
        done: !nextPageToken,
      };

      return Option.some([Chunk.fromIterable(messageIds), nextState]);
    }),
  );
};

const streamGmailMessagesToFeed = Effect.fn(function* (
  startDate: Date,
  feed: Feed.Feed,
  userId: string,
  label: string,
  existingGmailIds: Set<string>,
  restricted: boolean,
) {
  const config: DateRangeConfig = {
    startDate,
    endDate: restricted ? addDays(startDate, STREAMING_CONFIG.dateChunkDays + 1) : addDays(new Date(), 1),
    chunkDays: STREAMING_CONFIG.dateChunkDays,
  };

  const count = yield* Function.pipe(
    generateDateRanges(config),
    Stream.flatMap((dateChunk) => fetchMessagesForDateRange(userId, label, dateChunk), { concurrency: 1 }),
    Stream.filter((messageId) => {
      const isDuplicate = existingGmailIds.has(messageId);
      if (isDuplicate) {
        log('skipping duplicate message', { messageId });
      }
      return !isDuplicate;
    }),
    restricted ? Stream.take(STREAMING_CONFIG.restrictedMax) : Function.identity,
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
    Stream.mapEffect((message) => mapMessage(message)),
    Stream.filter(Predicate.isNotNullable),
    Stream.grouped(STREAMING_CONFIG.queueBatchSize),
    Stream.mapEffect((batch) =>
      Effect.gen(function* () {
        const messages = Chunk.toArray(batch);
        log('appending batch to feed', {
          count: messages.length,
        });
        yield* Feed.append(feed, messages);
        return messages.length;
      }),
    ),
    Stream.runFold(0, (acc, count) => acc + count),
  );

  return count;
});
