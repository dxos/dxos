//
// Copyright 2025 DXOS.org
//

import { addDays, format } from 'date-fns';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { EmailStage } from '@dxos/pipeline-email';

import { GoogleMail } from '../../../../apis';
import { GoogleMailApi, type GoogleMailApiError, type GoogleMailApiService } from '../../../../services';
import { type SyncStreamConfig } from '../../../../types';
import { type AttachmentMetadata } from '../mapper';

/** Gmail's streaming-pipeline tuning; see {@link SyncStreamConfig}. */
export const GMAIL_SYNC_CONFIG = {
  listPageSize: 500,
  fetchConcurrency: 5,
  commitPageSize: 10,
  maxItemsPerRun: 500,
  dateChunkDays: 7,
} as const satisfies SyncStreamConfig;

//
// Fetch messages
//

export type FetchMessagesProps = {
  readonly userId: string;
  readonly label: string;
  /**
   * The forward + backward windows this run covers (from `Cursor.resolveWindows`); either may be
   * absent. Forward is walked oldest→newest (incremental resume), backward newest→oldest
   * (initial/backfill). Both cover their `[start, end)` — direction only sets the walk order.
   */
  readonly windows: Cursor.Windows;
  readonly searchFilter?: string;
  /** Called with each date chunk's enumerated id count, to accumulate the retrieval total. */
  readonly onEnumerated?: (count: number) => void;
  /** Called once per message retrieved (full fetch), to advance progress. */
  readonly onRetrieved?: () => void;
};

/**
 * Streams the full Gmail messages for one bidirectional sync run: the forward window's ids (cheap
 * `listMessages`) then the backward window's, concatenated, each fetched in full (`getMessage`).
 *
 * The stream is intentionally UNBOUNDED — the per-run cap belongs *downstream of dedup*, not here. The
 * date-granular Gmail queries necessarily re-enumerate each boundary day's already-synced messages
 * (the forward high-water day, the backward low-water day), and those sort first within their window;
 * capping the raw id stream here would spend the whole per-run budget re-fetching messages that dedup
 * then drops, so the cursor would never advance past a dense boundary day. The caller instead caps on
 * genuinely-new (post-dedup) messages; `Stream.take` there halts this stream's enumeration and fetch
 * once the quota is met, bounding the over-fetch to the two boundary days.
 *
 * `Cursor.skipCommitted` drops ids already in the run's dedup set *before* `getMessage`, so a re-listed
 * boundary day's already-synced ids aren't downloaded at all (the post-fetch `Cursor.dedupStage` in the
 * caller stays the authority for anything the bounded seed didn't cover).
 */
export const fetchMessages = (
  config: FetchMessagesProps,
): Stream.Stream<GoogleMail.Message, GoogleMailApiError, GoogleMailApi | Cursor.Service> => {
  const idsFor = (window: Cursor.Window | undefined) =>
    window
      ? fetchMessageIds({
          userId: config.userId,
          label: config.label,
          direction: window.direction,
          start: window.start,
          end: window.end,
          searchFilter: config.searchFilter,
          onEnumerated: config.onEnumerated,
        })
      : Stream.empty;

  return Stream.concat(idsFor(config.windows.forward), idsFor(config.windows.backward)).pipe(
    Cursor.skipCommitted('skip-committed', (messageId) => messageId),
    Stream.mapEffect(
      (messageId) =>
        Effect.gen(function* () {
          const api = yield* GoogleMailApi;
          const message = yield* api
            .getMessage(config.userId, messageId)
            .pipe(Effect.withSpan('gmail-sync.fetch.message'));
          config.onRetrieved?.();
          return message;
        }),
      { concurrency: GMAIL_SYNC_CONFIG.fetchConcurrency },
    ),
  );
};

type FetchMessageIdsProps = {
  readonly userId: string;
  readonly label: string;
  readonly direction: Cursor.Direction;
  /** Full [start, end) range to cover; the walk order within it is set by `direction`. */
  readonly start: Date;
  readonly end: Date;
  readonly searchFilter?: string;
  /** Called with each date chunk's enumerated id count, to accumulate the retrieval total. */
  readonly onEnumerated?: (count: number) => void;
};

/** Streams Gmail message ids over one window's `[start, end)` range in `direction` order. */
const fetchMessageIds = (config: FetchMessageIdsProps) =>
  Stream.unwrap(
    Effect.gen(function* () {
      const api = yield* GoogleMailApi;

      // Only the forward walk chunks. It must emit its window oldest→newest so the cursor's high
      // watermark advances gap-free under a per-run cap or crash — Gmail lists newest-first, so a
      // naive walk would raise `high` past not-yet-fetched older messages and strand them inside the
      // synced range forever. Chunking bounds the in-memory reversal that fixes this (a long-offline
      // forward window isn't horizon-clamped and can be large). The backward walk (initial sync and
      // all backfill) is a single un-chunked query: Gmail's native newest-first order already *is* the
      // descending backward order, so `low` only moves down past fully-committed territory. Feed
      // insertion order no longer constrains this — messages are read by the date index, not append
      // order.
      const chunks: Stream.Stream<DateChunk> =
        config.direction === 'forward'
          ? generateForwardChunks({
              start: config.start,
              end: config.end,
              chunkDays: GMAIL_SYNC_CONFIG.dateChunkDays,
            })
          : Stream.make({ start: config.start, end: config.end });

      return Function.pipe(
        chunks,
        Stream.flatMap((dateChunk) => fetchMessagesForDateRange(api, dateChunk, config), {
          concurrency: 1,
        }),
      );
    }),
  );

const fetchMessagesForDateRange = (api: GoogleMailApiService, dateChunk: DateChunk, config: FetchMessageIdsProps) =>
  Stream.unwrap(
    Effect.gen(function* () {
      const { userId, label, direction, searchFilter, onEnumerated } = config;

      // `'all'` → All Mail (incl. Sent) minus Spam/Trash/Drafts/Chats, so conversations are complete;
      // any other value restricts to that Gmail label.
      const folderScope =
        label === 'all' ? 'in:anywhere -in:spam -in:trash -in:drafts -in:chats' : `in:anywhere label:${label}`;
      // `before:` is day-granular and excludes the whole day it names. A forward walk's *internal*
      // chunk boundaries are safe: each is covered by the older-side chunk's `after:`, which day-rounds
      // down and so is inclusive of that day (see `generateForwardChunks`'s contiguity doc). The
      // exception is the *backward* walk — a single window `[horizon, low)` whose `end` is `low`'s exact
      // timestamp when resuming backfill — where a mid-day `before:` boundary would silently drop every
      // same-day message older than that moment once `low` clamps to it. Round that query up one day;
      // per-message millisecond precision (`dedupStage`'s range check + dedup set) still filters out
      // that day's already-committed messages.
      const isBackwardWindow = direction === 'backward';
      const after = format(dateChunk.start, 'yyyy/MM/dd');
      const before = format(isBackwardWindow ? addDays(dateChunk.end, 1) : dateChunk.end, 'yyyy/MM/dd');
      const scope = `${folderScope} after:${after} before:${before}`;
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
          .listMessages(userId, query, GMAIL_SYNC_CONFIG.listPageSize, pageToken)
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

      // Report this chunk's exact count now (before any full-message fetch) so the meter's retrieval
      // total leads the per-message advance.
      onEnumerated?.(orderedMessageIds.length);
      return Stream.fromIterable(orderedMessageIds);
    }),
  );

//
// Date range utilities
//

type DateChunk = {
  readonly start: Date;
  readonly end: Date;
};

type ForwardChunks = {
  /** Inclusive-ish lower bound (oldest) of the range to walk. */
  readonly start: Date;
  /** Exclusive upper bound (newest) of the range to walk. */
  readonly end: Date;
  readonly chunkDays: number;
};

/**
 * Emits contiguous `chunkDays`-wide date windows spanning [start, end), oldest-first. Windows are
 * contiguous (day-granular `after:`/`before:` is exclusive at the upper bound), so every day in the
 * range is covered exactly once. Only the forward walk chunks — see {@link fetchMessageIds}.
 */
const generateForwardChunks = (config: ForwardChunks): Stream.Stream<DateChunk> =>
  Stream.unfoldChunkEffect(config.start, (position) =>
    Effect.gen(function* () {
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
    }),
  );

//
// Attachments
//

/**
 * Downloads each attachment's bytes via `GoogleMailApi.getAttachment`, decoding the base64url `data`
 * field. One failed download or decode error is logged and dropped rather than failing the whole
 * message — `Effect.try` wraps the decode step so a thrown error there is caught by `catchAll` below
 * rather than becoming an uncatchable defect that aborts the whole sync run.
 */
export const fetchAttachments = (
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
      { concurrency: GMAIL_SYNC_CONFIG.fetchConcurrency },
    );

    return fetched.filter((attachment): attachment is EmailStage.Attachment => attachment !== undefined);
  });

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
