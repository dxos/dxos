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

import { Capability } from '@dxos/app-framework';
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Credential } from '@dxos/compute';
import { Operation, Trace } from '@dxos/compute';
import { Database, Feed, Filter, Obj, Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { log } from '@dxos/log';
import { Integration } from '@dxos/plugin-integration';
import { Message } from '@dxos/types';

import { GoogleMail } from '../../../apis';
import { InboxResolver, GoogleCredentials } from '../../../services';
import { InboxCapabilities, InboxOperation, Mailbox } from '../../../types';
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
  const match = (integration.targets ?? []).find(
    (target) => target.object && EID.getEntityId(EID.tryParse(target.object.uri)!) === mailbox.id,
  );
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

    log('syncing gmail', { mailbox: mailboxRef.uri, userId, after: defaultAfter, restrictedMode });
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
      mailbox,
      userId,
      defaultLabel,
      existingGmailIds,
      restrictedMode,
      targetOptions.filter,
    );
    log('sync complete', { newMessages: newMessagesCount });
    return newMessagesCount;
  });

export default InboxOperation.GoogleMailSync.pipe(
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
  Obj.update(mailbox, (mailbox) => {
    const tags = (mailbox.tags ??= {});
    labels.forEach((labelItem) => {
      // Preserve any existing inverse-index (messages already tagged with this Gmail label
      // shouldn't be dropped when the label dictionary re-syncs).
      const existing = tags[labelItem.id];
      tags[labelItem.id] = {
        label: labelItem.name,
        source: 'provider',
        messages: existing?.messages ?? [],
      };
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
  mailbox: Mailbox.Mailbox,
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
        const mapped = Chunk.toArray(batch);
        const messages = mapped.map((m) => m.message);
        log('appending batch to feed', {
          count: messages.length,
        });
        yield* Feed.append(feed, messages);

        // Apply provider-label tags. `syncLabels` populated `mailbox.tags[gmailLabelId]`
        // with the label dictionary; here we add each just-appended message to the
        // `messages` inverse-index of every label Gmail assigned to it.
        Obj.update(mailbox, (mailbox) => {
          const tags = (mailbox.tags ??= {});
          for (const { message, labelIds } of mapped) {
            for (const labelId of labelIds) {
              const entry = (tags[labelId] ??= { label: labelId, source: 'provider', messages: [] });
              if (!entry.messages.some((ref) => Ref.isRef(ref) && ref.target?.id === message.id)) {
                entry.messages = [...entry.messages, Ref.make(message)];
              }
            }
          }
        });

        const extractorsConfig = mailbox.extractors;
        if (extractorsConfig && extractorsConfig.enabled.length > 0) {
          const extractors = yield* Capability.getAll(InboxCapabilities.ObjectExtractor);
          const db = Obj.getDatabase(mailbox);
          if (db) {
            for (const message of messages) {
              let best: { extractor: (typeof extractors)[number]; confidence: number } | undefined;
              for (const extractor of extractors) {
                if (!extractorsConfig.enabled.includes(extractor.id)) {
                  continue;
                }
                let result;
                try {
                  result = extractor.match(message);
                } catch (err) {
                  log.warn('auto-on-arrival match failed', {
                    err,
                    extractorId: extractor.id,
                    messageId: message.id,
                  });
                  continue;
                }
                if (!result.matched) {
                  continue;
                }
                const confidence = result.confidence ?? 0;
                if (confidence >= extractorsConfig.threshold && (!best || confidence > best.confidence)) {
                  best = { extractor, confidence };
                }
              }
              if (best) {
                yield* Operation.invoke(InboxOperation.ExtractMessage, {
                  db,
                  source: message,
                  extractorId: best.extractor.id,
                }).pipe(
                  Effect.catchAll((err) => {
                    log.warn('auto-on-arrival extract failed', { err, messageId: message.id });
                    return Effect.void;
                  }),
                );
              }
            }
          }
        }

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
