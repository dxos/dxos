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
import * as Stream from 'effect/Stream';

import { Operation } from '@dxos/compute';
import { Database, Obj, Ref, Relation } from '@dxos/echo';
import { type Resolver, resolve } from '@dxos/extractor';
import * as InboxResolver from '@dxos/extractor-lib';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
// Connection is referenced in the inferred type of this module's default export via
// InboxOperation.GoogleMailSync's schema; the import lets TypeScript name it in .d.ts.
// eslint-disable-next-line unused-imports/no-unused-imports
import { type Connection, SyncBinding } from '@dxos/plugin-connector';
import { Cursor, Person } from '@dxos/types';

import { type DecodedMessage, decodeBody, mapToMessage } from './mapper';
import { GoogleMail } from '../../../apis';
import { GMAIL_SOURCE } from '../../../constants';
import { GoogleCredentials } from '../../../services';
import { EmailStage } from '../../../sync';
import { InboxOperation, Mailbox } from '../../../types';
import { readBindingOptions } from '../../../util';
import { parseFromHeader } from '../../util';

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
  maxResults: 500,
  restrictedMax: 20,
  /** Commit page size — kept ≤ 15 so each `Feed.append` is a single atomic queue insert. */
  pageSize: 10,
} as const;

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

          const targetOptions = readBindingOptions(binding);
          // `syncBackDays` overrides the default window start when there is no cursor yet.
          const fallbackAfter =
            targetOptions.syncBackDays !== undefined
              ? format(subDays(new Date(), targetOptions.syncBackDays), 'yyyy-MM-dd')
              : normalizedAfter;
          const cursorKey = Cursor.parseKey(binding.cursor);
          log('syncing gmail', { mailbox: Obj.getURI(mailbox), userId, cursorKey, restrictedMode });

          const feed = yield* Database.load(mailbox.feed);
          // Resolve the child tag index so provider-label tags can be applied synchronously during commit.
          const tagIndex = yield* Database.load(mailbox.tags);
          const labelMap = yield* syncLabels(mailbox, userId).pipe(
            Effect.catchAll((error) => {
              log.catch(error);
              return Effect.succeed(new Map<string, string>());
            }),
          );

          // Resolve the sender contact, build the ECHO message, and resolve label ids to tag URIs via
          // the (Gmail-specific) label map captured here.
          const mapToMessageStage: Stage.Stage<DecodedMessage, EmailStage.Mapped, never, Resolver> = Stage.map(
            'map-to-message',
            (decoded: DecodedMessage) =>
              Effect.gen(function* () {
                const fromHeader = decoded.raw.payload.headers.find(({ name }) => name === 'From');
                const from = fromHeader ? parseFromHeader(fromHeader.value) : undefined;
                const contact = from?.email ? yield* resolve(Person.Person, { email: from.email }) : undefined;
                const mapped = mapToMessage(decoded, contact ?? undefined);
                const tagUris = mapped.labelIds.flatMap((labelId) => {
                  const uri = labelMap.get(labelId);
                  return uri ? [uri] : [];
                });
                return {
                  message: mapped.message,
                  foreignId: decoded.raw.id,
                  key: Number.parseInt(decoded.raw.internalDate),
                  tagUris,
                };
              }),
          );

          // fetch → dedup → decode → html→markdown → map → extract-contacts → (optional) on-arrival
          // extractors → commit each page. `SyncBinding.run` provides the per-run layer and stamps the
          // binding's cursor / lastSyncAt; fetch + `Resolver` requirements come from the layer stack below.
          const result = yield* SyncBinding.run(
            { binding, feed, tagIndex, foreignKeySource: GMAIL_SOURCE, cursorKey },
            gmailSource(userId, label, cursorKey, fallbackAfter, restrictedMode, targetOptions.filter).pipe(
              SyncBinding.dedupStage<GoogleMail.Message>(
                'dedup',
                (message) => message.id,
                (message) => Number.parseInt(message.internalDate),
              ),
              decodeBodyStage,
              EmailStage.htmlToMarkdown,
              mapToMessageStage,
              EmailStage.onArrivalExtractors(mailbox),
              EmailStage.extractContacts,
              Stream.grouped(STREAMING_CONFIG.pageSize),
              Pipeline.run({ sink: SyncBinding.commit }),
            ),
          );

          log('gmail sync complete', { newMessages: result.newMessages });
          return result;
        }).pipe(
          Effect.provide(
            Layer.mergeAll(FetchHttpClient.layer, InboxResolver.Live, GoogleCredentials.fromConnection(connectionRef)),
          ),
        );
      }),
  ),
  // Erase the inferred handler type (which transitively references Capability.Service via the sync
  // module) so the default export is portably nameable in the emitted .d.ts (TS2883).
  Operation.opaqueHandler,
);

// TODO(wittjosiah): Migrate this label→Tag sync onto a pipeline too (source: labels; sink:
//   find-or-create Tag), rather than the imperative loop below.
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

/** Gmail-specific decode stage: base64-decode the body; drop messages with no body. */
const decodeBodyStage: Stage.Stage<GoogleMail.Message, DecodedMessage, never, never> = Stage.map(
  'decode-body',
  (message: GoogleMail.Message) => Effect.sync(() => decodeBody(message) ?? undefined),
);

/**
 * Streams Gmail messages forward from the cursor: resume at the cursor's `internalDate` (else the
 * `fallbackAfter` window start), then date-windowed id fetch → per-message fetch.
 */
const gmailSource = (
  userId: string,
  label: string,
  cursorKey: number,
  fallbackAfter: string,
  restricted: boolean,
  searchFilter?: string,
) => {
  const startDate = cursorKey > 0 ? new Date(cursorKey) : new Date(fallbackAfter);
  const config: DateRangeConfig = {
    startDate,
    endDate: restricted ? addDays(startDate, STREAMING_CONFIG.dateChunkDays + 1) : addDays(new Date(), 1),
    chunkDays: STREAMING_CONFIG.dateChunkDays,
  };

  const messageIds = Function.pipe(
    generateDateRanges(config),
    Stream.flatMap((dateChunk) => fetchMessagesForDateRange(userId, label, dateChunk, searchFilter), {
      concurrency: 1,
    }),
    restricted ? Stream.take(STREAMING_CONFIG.restrictedMax) : Function.identity,
  );

  return messageIds.pipe(
    Stream.mapEffect((messageId) => GoogleMail.getMessage(userId, messageId), {
      concurrency: STREAMING_CONFIG.messageFetchConcurrency,
    }),
  );
};

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

      const messageIds = (messages ?? []).map((message) => message.id).reverse();
      const nextState = {
        pageToken: Option.fromNullable(nextPageToken),
        done: !nextPageToken,
      };

      return Option.some([Chunk.fromIterable(messageIds), nextState]);
    }),
  );
