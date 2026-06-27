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
import { Database, Feed, Filter, Obj, Ref, Relation } from '@dxos/echo';
import { log } from '@dxos/log';
// Connection is referenced in the inferred type of this module's default export via
// InboxOperation.GoogleMailSync's schema; the import lets TypeScript name it in .d.ts.
// eslint-disable-next-line unused-imports/no-unused-imports
import { type Connection, SyncBinding } from '@dxos/plugin-connector';
import { Tagging } from '@dxos/schema';
import { Message } from '@dxos/types';

import { GoogleMail } from '../../../apis';
import { GMAIL_SOURCE } from '../../../constants';
import { InboxResolver, GoogleCredentials } from '../../../services';
import { InboxCapabilities, InboxOperation, Mailbox } from '../../../types';
import { isAiServiceUnavailable } from '../../extractor';
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

const readBindingOptions = (binding: SyncBinding.SyncBinding) => {
  const raw = binding.options;
  if (!raw || typeof raw !== 'object') {
    return { syncBackDays: undefined as undefined | number, filter: undefined as undefined | string };
  }
  return {
    syncBackDays: typeof raw.syncBackDays === 'number' ? raw.syncBackDays : undefined,
    filter: typeof raw.filter === 'string' ? raw.filter : undefined,
  };
};

const syncSingleMailbox = (input: {
  binding: SyncBinding.SyncBinding;
  mailbox: Mailbox.Mailbox;
  userId: string;
  defaultLabel: string;
  defaultAfter: string;
  restrictedMode: boolean;
}) =>
  Effect.gen(function* () {
    const { binding, mailbox, userId, defaultLabel, defaultAfter, restrictedMode } = input;

    log('syncing gmail', { mailbox: Obj.getURI(mailbox), userId, after: defaultAfter, restrictedMode });
    const targetOptions = readBindingOptions(binding);
    const after =
      targetOptions.syncBackDays !== undefined
        ? format(subDays(new Date(), targetOptions.syncBackDays), 'yyyy-MM-dd')
        : defaultAfter;

    const feed = yield* Database.load(mailbox.feed);
    // Resolve the child tag index so provider-label tags can be applied synchronously below.
    if (mailbox.tags) {
      yield* Database.load(mailbox.tags);
    }

    const labelMap = yield* syncLabels(mailbox, userId).pipe(
      Effect.catchAll((error) => {
        log.catch(error);
        return Effect.succeed(new Map<string, string>());
      }),
    );
    log('synced labels', { count: labelMap.size });

    const objects = yield* Feed.runQuery(feed, Filter.type(Message.Message));
    const lastMessage = objects.at(-1);
    const recentMessages = objects.slice(-STREAMING_CONFIG.maxResults);
    const existingGmailIds = new Set(
      recentMessages.flatMap((msg) => {
        const meta = Obj.getMeta(msg);
        return meta.keys.filter((key) => key.source === GMAIL_SOURCE).map((key) => key.id);
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
      labelMap,
      targetOptions.filter,
    );
    log('sync complete', { newMessages: newMessagesCount });
    return newMessagesCount;
  });

export default InboxOperation.GoogleMailSync.pipe(
  Operation.withHandler(
    ({
      binding: bindingRef,
      userId = 'me',
      label = 'inbox',
      after = format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      restrictedMode = false,
    }) =>
      Effect.gen(function* () {
        const bindingObj = bindingRef.target;
        const db = bindingObj ? Obj.getDatabase(bindingObj) : undefined;
        if (!bindingObj || !db) {
          return { newMessages: 0 };
        }

        const connectionRef = Ref.make(Relation.getSource(bindingObj));
        const normalizedAfter = typeof after === 'number' ? format(new Date(after), 'yyyy-MM-dd') : after;

        return yield* Effect.gen(function* () {
          const binding = yield* Database.load(bindingRef);
          const mailbox = Relation.getTarget(binding);
          if (!Mailbox.instanceOf(mailbox)) {
            // The integration mechanism only ever binds Mailboxes for Gmail.
            return { newMessages: 0 };
          }

          const total = yield* syncSingleMailbox({
            binding,
            mailbox,
            userId,
            defaultLabel: label,
            defaultAfter: normalizedAfter,
            restrictedMode,
          });

          Relation.update(binding, (binding) => {
            binding.lastSyncAt = new Date().toISOString();
            binding.lastError = undefined;
          });

          return { newMessages: total };
        }).pipe(
          Effect.provide(
            Layer.mergeAll(FetchHttpClient.layer, InboxResolver.Live, GoogleCredentials.fromConnection(connectionRef)),
          ),
        );
      }),
  ),
);

// Syncs the Gmail label dictionary to `Tag` objects (one per label, carrying the Gmail label-id as
// a foreign key). Returns a `gmailLabelId -> Tag uri` map used to index messages by tag.
const syncLabels = Effect.fn(function* (mailbox: Mailbox.Mailbox, userId: string) {
  const { labels } = yield* GoogleMail.listLabels(userId);
  const labelMap = new Map<string, string>();
  const db = Obj.getDatabase(mailbox);
  if (db) {
    for (const labelItem of labels) {
      const tag = yield* Effect.promise(() =>
        Mailbox.findOrCreateGmailTag(db, { id: labelItem.id, name: labelItem.name }),
      );
      labelMap.set(labelItem.id, Mailbox.tagUri(tag));
    }
  }
  return labelMap;
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
  labelMap: Map<string, string>,
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

        // Apply provider-label tags: index each just-appended message under the Tag uri for every
        // Gmail label assigned to it (`syncLabels` created/updated those Tag objects).
        for (const { message, labelIds } of mapped) {
          for (const labelId of labelIds) {
            const uri = labelMap.get(labelId);
            if (uri) {
              Tagging.set(message, uri, { index: mailbox.tags.target });
            }
          }
        }

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
                yield* Operation.invoke(
                  InboxOperation.ExtractMessage,
                  {
                    db,
                    source: message,
                    extractorId: best.extractor.id,
                  },
                  { spaceId: db.spaceId },
                ).pipe(
                  Effect.catchAll((err) => {
                    // The AI service can be momentarily absent from the process-manager LayerStack
                    // during startup (the assistant plugin's `AiService` LayerSpec races the
                    // runtime build). Treat that as a deferrable skip — a later sync (or app load,
                    // once the stack carries the spec) re-attempts — rather than a hard failure.
                    if (isAiServiceUnavailable(err)) {
                      log.info('auto-on-arrival extract skipped: AI service not ready', { messageId: message.id });
                    } else {
                      log.warn('auto-on-arrival extract failed', { err, messageId: message.id });
                    }
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
