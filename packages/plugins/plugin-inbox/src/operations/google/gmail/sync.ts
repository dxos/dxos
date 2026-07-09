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
import {
  GoogleCredentials,
  GoogleMailApi,
  type GoogleMailApiError,
  type GoogleMailApiService,
} from '../../../services';
import { EmailStage, type SyncDirection, resolveSyncWindow } from '../../../sync';
import { InboxOperation, Mailbox } from '../../../types';
import { readBindingOptions } from '../../../util';
import { parseFromHeader } from '../../util';
import { type AttachmentMetadata, type DecodedMessage, decodeBody, mapToMessage } from './mapper';

type DateChunk = {
  readonly start: Date;
  readonly end: Date;
};

type DateRangeConfig = {
  /** Inclusive-ish lower bound (oldest) of the range to sync. */
  readonly start: Date;
  /** Exclusive upper bound (newest) of the range to sync. */
  readonly end: Date;
  readonly chunkDays: number;
  /** `forward` walks oldest→newest windows (incremental resume); `backward` walks newest→oldest (initial/backfill). */
  readonly direction: SyncDirection;
};

const STREAMING_CONFIG = {
  dateChunkDays: 7,
  messageFetchConcurrency: 5,
  maxResults: 500,
  /** Commit page size — kept ≤ 15 so each `Feed.append` is a single atomic queue insert. */
  pageSize: 10,
} as const;

/**
 * Runs the Gmail sync pipeline for a binding against the {@link GoogleMailApi} service (plus the
 * ambient operation services). It *requires* the service rather than providing HTTP/credentials
 * itself, so a test can drive the whole sync against a mock Gmail API + a real ECHO db — the
 * operation handler below wraps it with the Live layer. The return type is written out (not inferred)
 * so the module's emitted `.d.ts` can name it without the compiler expanding unnameable cross-package
 * types (TS2883); the deployed operation stays portable via `Operation.opaqueHandler`.
 */
export const runGmailSync = ({
  binding: bindingRef,
  userId = 'me',
  // Default to all mail (every folder incl. Sent) so full conversations sync; a specific label
  // restricts to that folder. See `fetchMessagesForDateRange` for how `'all'` maps to the query.
  label = 'all',
  after = format(subDays(new Date(), 30), 'yyyy-MM-dd'),
  before,
  direction,
}: {
  binding: Ref.Ref<SyncBinding.SyncBinding>;
  userId?: string;
  label?: string;
  /** Lower (oldest) bound of the range to sync — unix ms or yyyy-MM-dd. Defaults to 30 days ago. */
  after?: string | number;
  /** Upper (newest) bound of the range — unix ms or yyyy-MM-dd. Defaults to today. Backfill passes the oldest-synced date here to cap a backward walk. */
  before?: string | number;
  /**
   * Override the walk direction. Default is inferred from the cursor: no cursor → `backward` (initial
   * sync, newest-first from today); a cursor → `forward` (incremental, from the cursor). Pass
   * `backward` explicitly (with `before` = oldest-synced) to backfill older gaps.
   */
  direction?: SyncDirection;
}): Effect.Effect<
  { newMessages: number },
  GoogleMailApiError | EntityNotFoundError,
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

    const targetOptions = readBindingOptions(binding);
    const cursor = yield* Database.load(binding.cursor);
    const cursorKey = Cursor.parseKey(cursor.value);

    // Range + direction (shared resolver, so JMAP and future providers behave identically): no cursor →
    // backward initial from today to the horizon; cursor → forward incremental; `direction: backward` +
    // `before` = oldest-synced → backfill older gaps (never advances the monotonic cursor).
    const {
      direction: resolvedDirection,
      start: rangeStart,
      end: upperBound,
    } = resolveSyncWindow({
      cursorKey,
      now: new Date(),
      after,
      before,
      direction,
      syncBackDays: targetOptions.syncBackDays,
    });
    const rangeEnd = upperBound;
    const start = rangeStart;
    log('syncing gmail', {
      mailbox: Obj.getURI(mailbox),
      userId,
      cursorKey,
      direction: resolvedDirection,
      start: format(start, 'yyyy-MM-dd'),
      end: format(rangeEnd, 'yyyy-MM-dd'),
    });

    const feed = yield* Database.load(mailbox.feed);
    // Resolve the child tag index so provider-label tags can be applied synchronously during commit.
    const tagIndex = yield* Database.load(mailbox.tags);
    const labelMap = yield* syncLabels(mailbox, userId).pipe(
      Effect.catchAll((error) => {
        log.catch(error);
        return Effect.succeed(new Map<string, string>());
      }),
    );

    // Resolve the sender contact, build the ECHO message, and resolve label ids to tag URIs via the
    // (Gmail-specific) label map captured here.
    const mapToMessageStage: Stage.Stage<DecodedMessage, EmailStage.Mapped, never, Resolver | GoogleMailApi> =
      Stage.map('map-to-message', (decoded: DecodedMessage) =>
        Effect.gen(function* () {
          const fromHeader = decoded.raw.payload.headers.find(({ name }) => name === 'From');
          const from = fromHeader ? parseFromHeader(fromHeader.value) : undefined;
          const contact = from?.email ? yield* resolve(Person.Person, { email: from.email }) : undefined;
          const mapped = mapToMessage(decoded, contact ?? undefined);
          const tagUris = mapped.labelIds.flatMap((labelId) => {
            const uri = labelMap.get(labelId);
            return uri ? [uri] : [];
          });
          const attachments = yield* fetchAttachments(userId, decoded.raw.id, decoded.attachments);
          return {
            message: mapped.message,
            foreignId: decoded.raw.id,
            key: Number.parseInt(decoded.raw.internalDate),
            tagUris,
            attachments,
          };
        }),
      );

    // fetch → dedup → decode → map → extract-contacts → (optional) on-arrival extractors →
    // record-threads → commit each page. The SyncBinding layer advances the binding cursor per page.
    const stats: SyncBinding.Stats = { newMessages: 0 };
    yield* gmailSource({
      userId,
      label,
      direction: resolvedDirection,
      start,
      end: rangeEnd,
      searchFilter: targetOptions.filter,
    }).pipe(
      SyncBinding.dedupStage<GoogleMail.Message>(
        'dedup',
        (message) => message.id,
        (message) => Number.parseInt(message.internalDate),
        { direction: resolvedDirection },
      ),
      decodeBodyStage,
      // HTML→markdown (turndown) intentionally disabled: it was a measurable share of sync CPU and is
      // deferred pending benchmark-driven re-evaluation. Bodies stay raw HTML for now.
      // TODO(wittjosiah): Re-enable (or replace with a cheaper HTML→text) once the benchmark
      //   (docs/superpowers/specs/2026-07-04-mail-sync-performance-exploration.md) quantifies it.
      // EmailStage.htmlToMarkdown,
      mapToMessageStage,
      EmailStage.processAttachments(),
      EmailStage.onArrivalExtractors(mailbox),
      EmailStage.extractContacts(),
      Stream.grouped(STREAMING_CONFIG.pageSize),
      Pipeline.run({ sink: SyncBinding.commit }),
      Effect.provide(
        SyncBinding.layer({
          binding,
          feed,
          tagIndex,
          foreignKeySource: GMAIL_SOURCE,
          cursorKey,
          stats,
        }),
      ),
    );

    // Flush indexes once, at the end of the run, so cross-run dedup / contact resolution observe this
    // run's writes (per-page commits no longer flush — see `SyncBinding.commit`).
    yield* Database.flush({ indexes: true });

    log('gmail sync complete', { newMessages: stats.newMessages });
    return { newMessages: stats.newMessages };
  }).pipe(Effect.withSpan('gmail-sync'));

export default InboxOperation.GoogleMailSync.pipe(
  Operation.withHandler(({ binding: bindingRef, userId, label, after, before, direction }) =>
    Effect.gen(function* () {
      const bindingObj = bindingRef.target;
      if (!bindingObj || !Obj.getDatabase(bindingObj)) {
        return { newMessages: 0 };
      }
      const connectionRef = Ref.make(Relation.getSource(bindingObj));

      return yield* runGmailSync({ binding: bindingRef, userId, label, after, before, direction }).pipe(
        Effect.provide(
          Layer.mergeAll(
            GoogleMailApi.Live.pipe(
              Layer.provide(Layer.mergeAll(FetchHttpClient.layer, GoogleCredentials.fromConnection(connectionRef))),
            ),
            InboxResolver.Live,
          ),
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
const syncLabels = Effect.fn('gmail-sync.labels')(function* (mailbox: Mailbox.Mailbox, userId: string) {
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
 * Normalizes RFC 4648 §5 base64url (Gmail's attachment/body encoding) to standard base64 with
 * padding. The browser `Buffer` polyfill (`@dxos/node-std`, used when this pipeline runs client-side)
 * does not implement the `'base64url'` encoding name that Node's own `Buffer` accepts — decoding via
 * `Buffer.from(data, 'base64url')` throws `Unknown encoding` there, so normalize and use `'base64'`.
 */
const base64UrlToBase64 = (data: string): string => {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
  return base64 + padding;
};

/**
 * Downloads each attachment's bytes via `GoogleMailApi.getAttachment`, decoding the base64url `data`
 * field. One failed download or decode error is logged and dropped rather than failing the whole
 * message — `Effect.try` wraps the decode step so a thrown error there is caught by `catchAll` below
 * rather than becoming an uncatchable defect that aborts the whole sync run.
 */
const fetchAttachments = (
  userId: string,
  messageId: string,
  attachments: readonly AttachmentMetadata[],
): Effect.Effect<readonly EmailStage.Attachment[], never, GoogleMailApi> =>
  Effect.gen(function* () {
    const api = yield* GoogleMailApi;
    const fetched = yield* Effect.forEach(
      attachments,
      (attachment) =>
        api.getAttachment(userId, messageId, attachment.attachmentId).pipe(
          Effect.flatMap((body) =>
            // The single-arg form suffices: `catchAll` below discards the error regardless of its
            // shape, so there's no reason to map it to a specific type here.
            Effect.try(
              (): EmailStage.Attachment => ({
                name: attachment.filename,
                mimeType: attachment.mimeType,
                size: attachment.size,
                bytes: Buffer.from(base64UrlToBase64(body.data ?? ''), 'base64'),
                contentId: attachment.contentId,
              }),
            ),
          ),
          Effect.catchAll((error) => {
            log.catch(error, { messageId, attachmentId: attachment.attachmentId });
            return Effect.succeed(undefined);
          }),
        ),
      { concurrency: STREAMING_CONFIG.messageFetchConcurrency },
    );
    return fetched.filter((attachment): attachment is EmailStage.Attachment => attachment !== undefined);
  });

type GmailSourceConfig = {
  readonly userId: string;
  readonly label: string;
  readonly direction: SyncDirection;
  /** Full [start, end) range to cover; the walk order within it is set by `direction`. */
  readonly start: Date;
  readonly end: Date;
  readonly searchFilter?: string;
};

/**
 * Streams Gmail message ids over the [start, end) range in `direction` order (forward = oldest→newest
 * windows for incremental resume; backward = newest→oldest for initial/backfill), then fetches each
 * full message. Direction only changes the *order* windows are visited and messages within each
 * window are emitted; both cover the same range (see `fetchMessagesForDateRange`'s within-chunk
 * ordering).
 */
const gmailSource = (config: GmailSourceConfig) =>
  // Resolve the API service once, then build the stream (id fetch → per-message fetch) against it.
  Stream.unwrap(
    Effect.gen(function* () {
      const api = yield* GoogleMailApi;
      const rangeConfig: DateRangeConfig = {
        start: config.start,
        end: config.end,
        chunkDays: STREAMING_CONFIG.dateChunkDays,
        direction: config.direction,
      };

      const messageIds = Function.pipe(
        generateDateRanges(rangeConfig),
        Stream.flatMap(
          (dateChunk) =>
            fetchMessagesForDateRange(
              api,
              config.userId,
              config.label,
              dateChunk,
              config.direction,
              config.searchFilter,
            ),
          {
            concurrency: 1,
          },
        ),
      );

      return messageIds.pipe(
        Stream.mapEffect(
          (messageId) => api.getMessage(config.userId, messageId).pipe(Effect.withSpan('gmail-sync.fetch.message')),
          { concurrency: STREAMING_CONFIG.messageFetchConcurrency },
        ),
      );
    }),
  );

/**
 * Emits contiguous `chunkDays`-wide date windows spanning [start, end). `forward` yields them
 * oldest-first; `backward` yields them newest-first. Windows are contiguous (day-granular `after:`/
 * `before:` is exclusive at the upper bound), so every day in the range is covered exactly once.
 */
const generateDateRanges = (config: DateRangeConfig): Stream.Stream<DateChunk> =>
  Stream.unfoldChunkEffect(config.direction === 'forward' ? config.start : config.end, (position) =>
    Effect.gen(function* () {
      if (config.direction === 'forward') {
        if (position >= config.end) {
          return Option.none();
        }
        const chunkEnd = addDays(position, config.chunkDays);
        const end = chunkEnd > config.end ? config.end : chunkEnd;
        const chunk: DateChunk = { start: position, end };
        log('processing date chunk', {
          start: format(chunk.start, 'yyyy-MM-dd'),
          end: format(chunk.end, 'yyyy-MM-dd'),
        });
        return Option.some([Chunk.of(chunk), end]);
      }
      if (position <= config.start) {
        return Option.none();
      }
      const chunkStart = subDays(position, config.chunkDays);
      const start = chunkStart < config.start ? config.start : chunkStart;
      const chunk: DateChunk = { start, end: position };
      log('processing date chunk', { start: format(chunk.start, 'yyyy-MM-dd'), end: format(chunk.end, 'yyyy-MM-dd') });
      return Option.some([Chunk.of(chunk), start]);
    }),
  );

const fetchMessagesForDateRange = (
  api: GoogleMailApiService,
  userId: string,
  label: string,
  dateChunk: DateChunk,
  direction: SyncDirection,
  searchFilter?: string,
) =>
  Stream.unwrap(
    Effect.gen(function* () {
      // `'all'` → All Mail (incl. Sent) minus Spam/Trash/Drafts/Chats, so conversations are complete;
      // any other value restricts to that Gmail label.
      const folderScope =
        label === 'all' ? 'in:anywhere -in:spam -in:trash -in:drafts -in:chats' : `in:anywhere label:${label}`;
      const scope = `${folderScope} after:${format(dateChunk.start, 'yyyy/MM/dd')} before:${format(dateChunk.end, 'yyyy/MM/dd')}`;
      const query = searchFilter ? `${scope} ${searchFilter}` : scope;

      // Gathers every page of the chunk's query into memory before ordering. Gmail paginates
      // newest-first *within* each page but reversing page-by-page would only be locally correct: a
      // `forward` walk needs the whole chunk oldest-first so the cursor advances monotonically —
      // reversing per page would let a newer page's messages commit (and raise the cursor) before an
      // older page from the same chunk, which can permanently skip that older page if the run is
      // interrupted between them (a later forward run's query starts *from* the cursor, so it would
      // never re-fetch dates before it). Chunks stay small (`chunkDays`) so this comfortably fits in
      // memory; shrink `chunkDays` further if a mailbox's volume ever makes that not true.
      const messageIds: string[] = [];
      let pageToken: string | undefined;
      do {
        log('fetching message IDs', { query, pageToken });
        const { messages, nextPageToken } = yield* api
          .listMessages(userId, query, STREAMING_CONFIG.maxResults, pageToken)
          .pipe(Effect.withSpan('gmail-sync.fetch.list'));
        messageIds.push(...(messages ?? []).map((message) => message.id));
        log('fetched message IDs', { count: messages?.length ?? 0, done: !nextPageToken });
        pageToken = nextPageToken;
      } while (pageToken);

      // Gmail returns messages newest-first across the whole query (every page). A `backward` walk
      // (initial sync/backfill) wants that native order preserved end-to-end so the most recent
      // messages commit first; a `forward` walk (incremental resume) wants oldest-first across the
      // whole chunk, matching the chunk-level walk direction (see `generateDateRanges`).
      const orderedMessageIds = direction === 'forward' ? messageIds.slice().reverse() : messageIds;
      return Stream.fromIterable(orderedMessageIds);
    }),
  );
