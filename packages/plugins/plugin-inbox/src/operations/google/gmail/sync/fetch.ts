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
   * Forward/backward windows this run covers (from `Cursor.resolveWindows`); either may be absent.
   * Direction only sets the walk order over each `[start, end)`: forward oldest→newest (incremental
   * resume), backward newest→oldest (initial/backfill).
   */
  readonly windows: Cursor.Windows;
  readonly searchFilter?: string;
  /** Called with each date chunk's enumerated id count, to accumulate the retrieval total. */
  readonly onEnumerated?: (count: number) => void;
  /** Called once per message retrieved (full fetch), to advance progress. */
  readonly onRetrieved?: () => void;
};

/**
 * Streams full Gmail messages for one bidirectional run: forward window ids then backward, concatenated
 * (cheap `listMessages`), each fetched in full (`getMessage`).
 *
 * Intentionally UNBOUNDED — the per-run cap belongs downstream of dedup. Boundary days get
 * re-enumerated and sort first within their window, so capping the raw id stream would spend the budget
 * re-fetching messages dedup then drops and stall the cursor past a dense boundary day. The caller caps
 * on post-dedup messages instead; its `Stream.take` halts this stream once the quota is met.
 * `Cursor.skipCommitted` drops already-committed ids before `getMessage`, so a re-listed boundary day
 * isn't downloaded.
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

      // Only the forward walk chunks: it must emit oldest→newest so the cursor's high watermark
      // advances gap-free under a cap or crash — Gmail lists newest-first, so a naive walk would raise
      // `high` past unfetched older messages and strand them. Chunking bounds the in-memory reversal
      // that achieves this. The backward walk (initial sync/backfill) is a single un-chunked query:
      // Gmail's native newest-first order already is the descending backward order, so `low` only moves
      // down past committed territory.
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
      // `before:` is day-granular and excludes the day it names. Forward internal chunk boundaries are
      // safe (covered by the older chunk's inclusive `after:`). But the backward window's `end` is
      // `low`'s exact timestamp when resuming backfill, so a mid-day `before:` would drop same-day
      // messages older than that moment — round it up one day; per-message ms precision (`dedupStage`'s
      // range check + dedup set) still filters that day's already-committed messages.
      const isBackwardWindow = direction === 'backward';
      const after = format(dateChunk.start, 'yyyy/MM/dd');
      const before = format(isBackwardWindow ? addDays(dateChunk.end, 1) : dateChunk.end, 'yyyy/MM/dd');
      const scope = `${folderScope} after:${after} before:${before}`;
      const query = searchFilter ? `${scope} ${searchFilter}` : scope;

      const listPage = (pageToken: string | undefined) =>
        api
          .listMessages(userId, query, GMAIL_SYNC_CONFIG.listPageSize, pageToken)
          .pipe(Effect.withSpan('gmail-sync.fetch.list'));

      // Backward commits newest-first — Gmail's native page order — so stream each page's ids lazily.
      // A downstream `Stream.take` (the cap) then halts enumeration rather than paging through all of
      // `[horizon, low)` every run. `low` only moves down past committed territory, so an interrupted
      // page-stream resumes gap-free from the advanced `low`.
      if (direction === 'backward') {
        return Stream.paginateChunkEffect(undefined as string | undefined, (pageToken) =>
          Effect.gen(function* () {
            log('fetching message IDs', { query, pageToken });
            const { messages, nextPageToken } = yield* listPage(pageToken);
            const ids = (messages ?? []).map((message) => message.id);
            log('fetched message IDs', { count: ids.length, done: !nextPageToken });
            // Report each page's count as it arrives so the meter's retrieval total leads the fetch.
            onEnumerated?.(ids.length);
            return [Chunk.fromIterable(ids), Option.fromNullable(nextPageToken)];
          }),
        );
      }

      // Forward needs the whole chunk oldest-first so the cursor advances monotonically — Gmail
      // paginates newest-first, and reversing page-by-page would commit a newer page (raising the
      // cursor) before an older one from the same chunk, permanently skipping it on interrupt. So buffer
      // the chunk and reverse; `chunkDays` keeps it small enough to fit in memory.
      const messageIds: string[] = [];
      let pageToken: string | undefined;
      do {
        log('fetching message IDs', { query, pageToken });
        const { messages, nextPageToken } = yield* listPage(pageToken);
        messageIds.push(...(messages ?? []).map((message) => message.id));
        log('fetched message IDs', { count: messages?.length ?? 0, done: !nextPageToken });
        pageToken = nextPageToken;
      } while (pageToken);

      const orderedMessageIds = messageIds.slice().reverse();

      // Report this chunk's count before any full-message fetch, so the meter's total leads the advance.
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
 * Emits contiguous `chunkDays`-wide windows spanning [start, end), oldest-first, so every day is covered
 * exactly once (day-granular `after:`/`before:` is exclusive at the upper bound). Only the forward walk
 * chunks — see {@link fetchMessageIds}.
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
 * Downloads each attachment's bytes via `GoogleMailApi.getAttachment`, decoding the base64url `data`.
 * A failed download or decode is logged and dropped rather than failing the message — `Effect.try`
 * wraps the decode so a throw is caught by `catchAll` instead of becoming a run-aborting defect.
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
            // Single-arg form suffices: `catchAll` below discards the error regardless of shape.
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
 * Normalizes base64url (RFC 4648 §5, Gmail's encoding) to padded standard base64. The browser `Buffer`
 * polyfill (`@dxos/node-std`, client-side) doesn't accept the `'base64url'` encoding name Node's
 * `Buffer` does — it throws `Unknown encoding` — so normalize and use `'base64'`.
 */
const base64UrlToBase64 = (data: string): string => {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
  return base64 + padding;
};
