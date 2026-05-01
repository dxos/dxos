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

import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { Trace } from '@dxos/functions';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { Integration } from '@dxos/plugin-integration/types';
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

const readMailboxTargetOptions = (integration: Integration.Integration, mailbox: Mailbox.Mailbox) => {
  const match = (integration.targets ?? []).find((target) => target.object?.dxn?.asEchoDXN()?.echoId === mailbox.id);
  const raw = match?.options;
  if (!raw || typeof raw !== 'object') {
    return { syncBackDays: undefined as undefined | number, filter: undefined as undefined | string };
  }
  const record = raw as Record<string, unknown>;
  return {
    syncBackDays: typeof record.syncBackDays === 'number' ? record.syncBackDays : undefined,
    filter: typeof record.filter === 'string' ? record.filter : undefined,
  };
};

const collectMailboxRefsFromIntegration = (
  integration: Integration.Integration,
): Effect.Effect<Array<Ref.Ref<Mailbox.Mailbox>>> =>
  Effect.gen(function* () {
    const refs: Array<Ref.Ref<Mailbox.Mailbox>> = [];
    for (const target of integration.targets ?? []) {
      if (!target.object) {
        continue;
      }
      const loaded = yield* Database.loadOption(target.object);
      if (Option.isSome(loaded) && Mailbox.instanceOf(loaded.value)) {
        refs.push(Ref.make(loaded.value));
      }
    }
    return refs;
  });

const syncSingleMailbox = (input: {
  integration: Integration.Integration;
  mailboxRef: Ref.Ref<Mailbox.Mailbox>;
  userId: string;
  defaultLabel: string;
  defaultAfter: string;
  restrictedMode: boolean;
}) =>
  Effect.gen(function* () {
    const { integration, mailboxRef, userId, defaultLabel, defaultAfter, restrictedMode } = input;

    log('syncing gmail', { mailbox: mailboxRef.dxn.toString(), userId, after: defaultAfter, restrictedMode });
    const mailbox = yield* Database.load(mailboxRef);
    const targetOptions = readMailboxTargetOptions(integration, mailbox);
    const after =
      targetOptions.syncBackDays !== undefined
        ? format(subDays(new Date(), targetOptions.syncBackDays), 'yyyy-MM-dd')
        : defaultAfter;

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
      searchFilter: targetOptions.filter,
    });

    const newMessagesCount = yield* streamGmailMessagesToFeed(
      startDate,
      feed,
      userId,
      defaultLabel,
      existingGmailIds,
      restrictedMode,
      targetOptions.filter,
    );
    log('sync complete', { newMessages: newMessagesCount });
    return newMessagesCount;
  });

export default GoogleMailSync.pipe(
  Operation.withHandler(
    ({
      integration: integrationRef,
      mailbox: mailboxRefOptional,
      userId = 'me',
      label = 'inbox',
      after = format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      restrictedMode = false,
    }) =>
      Effect.gen(function* () {
        const normalizedAfter = typeof after === 'number' ? format(new Date(after), 'yyyy-MM-dd') : after;
        const integration = yield* Database.load(integrationRef);
        const mailboxRefs =
          mailboxRefOptional !== undefined
            ? [mailboxRefOptional]
            : yield* collectMailboxRefsFromIntegration(integration);

        let total = 0;
        for (const mailboxRef of mailboxRefs) {
          total += yield* syncSingleMailbox({
            integration,
            mailboxRef,
            userId,
            defaultLabel: label,
            defaultAfter: normalizedAfter,
            restrictedMode,
          });
        }

        return { newMessages: total };
      }).pipe(
        Effect.provide(
          Layer.mergeAll(FetchHttpClient.layer, InboxResolver.Live, GoogleCredentials.fromIntegration(integrationRef)),
        ),
      ),
  ),
);

const syncLabels = Effect.fn(function* (mailbox: Mailbox.Mailbox, userId: string) {
  const { labels } = yield* GoogleMail.listLabels(userId);
  Obj.change(mailbox, (mailbox) => {
    labels.forEach((labelItem) => {
      (mailbox.labels ??= {})[labelItem.id] = labelItem.name;
    });
  });
  return labels.length;
});

const generateDateRanges = (config: DateRangeConfig): Stream.Stream<DateChunk> =>
  Stream.unfoldChunkEffect(config.startDate, (currentStart) =>
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

const fetchMessagesForDateRange = (userId: string, label: string, dateChunk: DateChunk, searchFilter?: string) =>
  Stream.unfoldChunkEffect({ pageToken: Option.none<string>(), done: false }, (state) =>
    Effect.gen(function* () {
      if (state.done) {
        return Option.none();
      }

      const scope = `in:anywhere label:${label} after:${format(dateChunk.start, 'yyyy/MM/dd')} before:${format(dateChunk.end, 'yyyy/MM/dd')}`;
      const query = searchFilter ? `${scope} ${searchFilter}` : scope;
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

const streamGmailMessagesToFeed = Effect.fn(function* (
  startDate: Date,
  feed: Feed.Feed,
  userId: string,
  label: string,
  existingGmailIds: Set<string>,
  restricted: boolean,
  searchFilter?: string,
) {
  const config: DateRangeConfig = {
    startDate,
    endDate: restricted ? addDays(startDate, STREAMING_CONFIG.dateChunkDays + 1) : addDays(new Date(), 1),
    chunkDays: STREAMING_CONFIG.dateChunkDays,
  };

  const count = yield* Function.pipe(
    generateDateRanges(config),
    Stream.flatMap((dateChunk) => fetchMessagesForDateRange(userId, label, dateChunk, searchFilter), {
      concurrency: 1,
    }),
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
    Stream.runFoldEffect(
      0,
      Effect.fnUntraced(function* (acc, count) {
        yield* Trace.emitStatus(`Syncing messages: ${acc + count}`);
        return acc + count;
      }),
    ),
  );

  return count;
});
