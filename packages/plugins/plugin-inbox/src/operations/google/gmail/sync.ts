//
// Copyright 2025 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import type * as HttpClientError from '@effect/platform/HttpClientError';
import { addDays, format, subDays } from 'date-fns';
import type * as Cause from 'effect/Cause';
import * as Chunk from 'effect/Chunk';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import type * as ParseResult from 'effect/ParseResult';
import * as Stream from 'effect/Stream';

import { type Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Obj, Ref, Relation } from '@dxos/echo';
import { type EntityNotFoundError } from '@dxos/echo/Err';
import { type Resolver, resolve } from '@dxos/extractor';
import * as InboxResolver from '@dxos/extractor-lib';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
// Connection is referenced in the inferred type of this module's default export via
// InboxOperation.GoogleMailSync's schema; the import lets TypeScript name it in .d.ts.
// eslint-disable-next-line unused-imports/no-unused-imports
import { type Connection, SyncBinding } from '@dxos/plugin-connector';
import { Cursor, Person } from '@dxos/types';

import { GoogleMail } from '../../../apis';
import { GMAIL_SOURCE } from '../../../constants';
import { GoogleApiError } from '../../../errors';
import { GoogleCredentials, GoogleMailApi, type GoogleMailApiService } from '../../../services';
import { EmailStage } from '../../../sync';
import { InboxOperation, Mailbox } from '../../../types';
import { readBindingOptions } from '../../../util';
import { parseFromHeader } from '../../util';
import { type DecodedMessage, decodeBody, mapToMessage } from './mapper';

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
  dateChunkDays: 1,
  messageFetchConcurrency: 5,
  maxResults: 100,
  restrictedMax: 10,
  /** Commit page size — kept ≤ 15 so each `Feed.append` is a single atomic queue insert. */
  pageSize: 10,
  /**
   * Max time to wait before committing a partial page. Bounds time-to-first-message: with small date
   * windows a full page of `pageSize` can take many sequential fetches to accumulate, so commit
   * whatever is ready within this window instead of stalling the UI until 10 arrive.
   */
  pageTimeout: Duration.seconds(1),
} as const;

// Single-flight guard keyed by binding id: a full "all mail" sync can run for many minutes, so the
// 5-minute timer trigger (or a repeat manual invoke) would otherwise start a second concurrent sync
// over the same feed — doubling Gmail traffic, main-thread work, and memory, and keeping the binding
// "syncing" indefinitely. A run in progress covers the caller's intent (its cursor advances), so a
// concurrent request is skipped.
const activeSyncs = new Set<string>();

/**
 * Runs the Gmail sync pipeline for a binding against the {@link GoogleMailApi} service (plus the
 * ambient operation services). It *requires* the service rather than providing HTTP/credentials
 * itself, so a test can drive the whole sync against a mock Gmail API + a real ECHO db — the
 * operation handler below wraps it with the Live layer.
 */
export const runGmailSync = ({
  binding: bindingRef,
  userId = 'me',
  // Default to all mail (every folder incl. Sent) so full conversations sync; a specific label
  // restricts to that folder. See `fetchMessagesForDateRange` for how `'all'` maps to the query.
  label = 'all',
  after = format(subDays(new Date(), 30), 'yyyy-MM-dd'),
  restrictedMode = false,
}: {
  binding: Ref.Ref<SyncBinding.SyncBinding>;
  userId?: string;
  label?: string;
  after?: string | number;
  restrictedMode?: boolean;
}): Effect.Effect<
  { newMessages: number },
  | EntityNotFoundError
  | GoogleApiError
  | GoogleMail.GoogleError
  | ParseResult.ParseError
  | Cause.TimeoutException
  | HttpClientError.HttpClientError,
  GoogleMailApi | Database.Service | Resolver | Capability.Service | Operation.Service
> =>
  Effect.gen(function* () {
    const binding = yield* Database.load(bindingRef);
    const mailbox = Relation.getTarget(binding);
    // The integration mechanism only ever binds Mailboxes for Gmail.
    if (!Mailbox.instanceOf(mailbox)) {
      return { newMessages: 0 };
    }
    const db = Obj.getDatabase(mailbox);
    if (!db) {
      return { newMessages: 0 };
    }

    const normalizedAfter = typeof after === 'number' ? format(new Date(after), 'yyyy-MM-dd') : after;
    const targetOptions = readBindingOptions(binding);
    // `syncBackDays` overrides the default window start when there is no cursor yet.
    const fallbackAfter =
      targetOptions.syncBackDays !== undefined
        ? format(subDays(new Date(), targetOptions.syncBackDays), 'yyyy-MM-dd')
        : normalizedAfter;
    const cursor = yield* Database.load(binding.cursor);
    const cursorKey = Cursor.parseKey(cursor.value);
    log('syncing gmail', { mailbox: Obj.getURI(mailbox), userId, cursorKey, restrictedMode });

    const feed = yield* Database.load(mailbox.feed);
    // Resolve the child tag index so provider-label tags can be applied synchronously during commit.
    const tagIndex = yield* Database.load(mailbox.tags);
    // Conversation index (lazily provisioned): thread membership is recorded during commit.
    const threadIndex = Mailbox.getOrCreateThreadIndex(mailbox, db);
    const labelMap = yield* syncLabels(mailbox, userId).pipe(
      Effect.catchAll((error) => {
        log.catch(error);
        return Effect.succeed(new Map<string, string>());
      }),
    );

    // Resolve the sender contact, build the ECHO message, and resolve label ids to tag URIs via the
    // (Gmail-specific) label map captured here.
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

    // fetch → dedup → decode → map → extract-contacts → (optional) on-arrival extractors →
    // record-threads → commit each page. The SyncBinding layer advances the binding cursor per page.
    const stats: SyncBinding.Stats = { newMessages: 0 };
    yield* gmailSource(userId, label, cursorKey, fallbackAfter, restrictedMode, targetOptions.filter).pipe(
      SyncBinding.dedupStage<GoogleMail.Message>(
        'dedup',
        (message) => message.id,
        (message) => Number.parseInt(message.internalDate),
      ),
      decodeBodyStage,
      // HTML→markdown (turndown) intentionally disabled: it was a measurable share of sync CPU and is
      // deferred pending benchmark-driven re-evaluation. Bodies stay raw HTML for now.
      // TODO(wittjosiah): Re-enable (or replace with a cheaper HTML→text) once the benchmark
      //   (docs/superpowers/specs/2026-07-04-mail-sync-performance-exploration.md) quantifies it.
      // EmailStage.htmlToMarkdown,
      mapToMessageStage,
      EmailStage.onArrivalExtractors(mailbox),
      EmailStage.extractContacts(),
      EmailStage.recordThreads(threadIndex),
      // Emit a page when it fills OR after `pageTimeout`, so the first messages commit (and render) as
      // soon as they're processed rather than waiting to accumulate a full page.
      Stream.groupedWithin(STREAMING_CONFIG.pageSize, STREAMING_CONFIG.pageTimeout),
      Pipeline.run({ sink: SyncBinding.commit }),
      Effect.provide(SyncBinding.layer({ binding, feed, tagIndex, foreignKeySource: GMAIL_SOURCE, cursorKey, stats })),
    );

    // Flush indexes once, at the end of the run, so cross-run dedup / contact resolution observe this
    // run's writes (per-page commits no longer flush — see `SyncBinding.commit`).
    yield* Effect.promise(() => db.flush({ indexes: true }));

    log('gmail sync complete', { newMessages: stats.newMessages });
    return { newMessages: stats.newMessages };
  });

export default InboxOperation.GoogleMailSync.pipe(
  Operation.withHandler(({ binding: bindingRef, userId, label, after, restrictedMode }) =>
    Effect.gen(function* () {
      const bindingObj = bindingRef.target;
      if (!bindingObj || !Obj.getDatabase(bindingObj)) {
        return { newMessages: 0 };
      }
      // Single-flight guard: a full "all mail" sync runs for minutes, so the 5-minute timer trigger (or
      // a repeat manual invoke) would otherwise start a second concurrent sync over the same feed —
      // doubling Gmail traffic, main-thread work, and memory. A run in progress covers the caller.
      if (activeSyncs.has(bindingObj.id)) {
        log('gmail sync already running for binding, skipping', { binding: bindingObj.id });
        return { newMessages: 0 };
      }
      activeSyncs.add(bindingObj.id);
      const connectionRef = Ref.make(Relation.getSource(bindingObj));

      return yield* runGmailSync({ binding: bindingRef, userId, label, after, restrictedMode }).pipe(
        // Provide the Live Gmail API (real HTTP + connection credentials) and the contact resolver; a
        // test provides `GoogleMailApi.mock(...)` + `InboxResolver` over this same seam instead.
        Effect.provide(
          Layer.mergeAll(
            GoogleMailApi.Live.pipe(
              Layer.provide(Layer.mergeAll(FetchHttpClient.layer, GoogleCredentials.fromConnection(connectionRef))),
            ),
            InboxResolver.Live,
          ),
        ),
        // Release the single-flight guard on completion, interruption, or failure.
        Effect.ensuring(Effect.sync(() => activeSyncs.delete(bindingObj.id))),
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
  const api = yield* GoogleMailApi;
  const { labels } = yield* api.listLabels(userId);
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
) =>
  // Resolve the API service once, then build the stream (id fetch → per-message fetch) against it.
  Stream.unwrap(
    Effect.gen(function* () {
      const api = yield* GoogleMailApi;
      const startDate = cursorKey > 0 ? new Date(cursorKey) : new Date(fallbackAfter);
      const config: DateRangeConfig = {
        startDate,
        endDate: restricted ? addDays(startDate, STREAMING_CONFIG.dateChunkDays + 1) : addDays(new Date(), 1),
        chunkDays: STREAMING_CONFIG.dateChunkDays,
      };

      const messageIds = Function.pipe(
        generateDateRanges(config),
        Stream.flatMap((dateChunk) => fetchMessagesForDateRange(api, userId, label, dateChunk, searchFilter), {
          concurrency: 1,
        }),
        restricted ? Stream.take(STREAMING_CONFIG.restrictedMax) : Function.identity,
      );

      return messageIds.pipe(
        Stream.mapEffect((messageId) => api.getMessage(userId, messageId), {
          concurrency: STREAMING_CONFIG.messageFetchConcurrency,
        }),
      );
    }),
  );

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

const fetchMessagesForDateRange = (
  api: GoogleMailApiService,
  userId: string,
  label: string,
  dateChunk: DateChunk,
  searchFilter?: string,
) =>
  Stream.unfoldChunkEffect({ pageToken: Option.none<string>(), done: false }, (state) =>
    Effect.gen(function* () {
      if (state.done) {
        return Option.none();
      }

      // `'all'` → All Mail (incl. Sent) minus Spam/Trash/Drafts/Chats, so conversations are complete;
      // any other value restricts to that Gmail label.
      const folderScope =
        label === 'all' ? 'in:anywhere -in:spam -in:trash -in:drafts -in:chats' : `in:anywhere label:${label}`;
      const scope = `${folderScope} after:${format(dateChunk.start, 'yyyy/MM/dd')} before:${format(dateChunk.end, 'yyyy/MM/dd')}`;
      const query = searchFilter ? `${scope} ${searchFilter}` : scope;
      log('fetching message IDs', {
        query,
        pageToken: Option.getOrUndefined(state.pageToken),
      });

      const { messages, nextPageToken } = yield* api.listMessages(
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
