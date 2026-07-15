//
// Copyright 2025 DXOS.org
//

import { addDays, format, subDays } from 'date-fns';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { EmailStage } from '@dxos/pipeline-email';

import { GoogleMailApi, type GoogleMailApiService } from '../../../../services';
import { type AttachmentMetadata } from '../mapper';

// TODO(burdon): Reconcile with other config types.
export const STREAMING_CONFIG = {
  dateChunkDays: 7,
  messageFetchConcurrency: 5,
  maxResults: 500,
  /** Commit page size — kept ≤ 15 so each `Feed.append` is a single atomic queue insert. */
  pageSize: 10,
  // TODO(burdon): Not yet wired up.
  maxPages: 1,
} as const;

//
// Fetch messages
//

export type FetchMessagesProps = {
  readonly userId: string;
  readonly label: string;
  readonly direction: Cursor.Direction;
  /** Full [start, end) range to cover; the walk order within it is set by `direction`. */
  readonly start: Date;
  readonly end: Date;
  readonly searchFilter?: string;
  /** Called with each date chunk's enumerated id count, to accumulate the retrieval total. */
  readonly onEnumerated?: (count: number) => void;
  /** Called once per message retrieved (full fetch), to advance progress. */
  readonly onRetrieved?: () => void;
};

/**
 * Streams Gmail message ids over the [start, end) range in `direction` order (forward = oldest→newest
 * windows for incremental resume; backward = newest→oldest for initial/backfill), then fetches each
 * full message. Direction only changes the *order* windows are visited and messages within each
 * window are emitted; both cover the same range (see `fetchMessagesForDateRange`'s within-chunk
 * ordering).
 */
export const fetchMessages = (config: FetchMessagesProps) =>
  // Resolve the API service once, then build the stream (id fetch → per-message fetch) against it.
  Stream.unwrap(
    Effect.gen(function* () {
      const api = yield* GoogleMailApi;
      const rangeConfig: DateRange = {
        start: config.start,
        end: config.end,
        chunkDays: STREAMING_CONFIG.dateChunkDays,
        direction: config.direction,
      };

      const messageIds = Function.pipe(
        generateDateRanges(rangeConfig),
        Stream.flatMap((dateChunk) => fetchMessagesForDateRange(api, dateChunk, config), {
          concurrency: 1,
        }),
      );

      return messageIds.pipe(
        Stream.mapEffect(
          (messageId) =>
            api.getMessage(config.userId, messageId).pipe(
              Effect.withSpan('gmail-sync.fetch.message'),
              Effect.tap(() => Effect.sync(() => config.onRetrieved?.())),
            ),
          {
            concurrency: STREAMING_CONFIG.messageFetchConcurrency,
          },
        ),
      );
    }),
  );

const fetchMessagesForDateRange = (api: GoogleMailApiService, dateChunk: DateChunk, config: FetchMessagesProps) =>
  Stream.unwrap(
    Effect.gen(function* () {
      const { userId, label, direction, searchFilter, onEnumerated } = config;

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

type DateRange = {
  /** Inclusive-ish lower bound (oldest) of the range to sync. */
  readonly start: Date;
  /** Exclusive upper bound (newest) of the range to sync. */
  readonly end: Date;
  readonly chunkDays: number;
  /** `forward` walks oldest→newest windows (incremental resume); `backward` walks newest→oldest (initial/backfill). */
  readonly direction: Cursor.Direction;
};

/**
 * Emits contiguous `chunkDays`-wide date windows spanning [start, end). `forward` yields them
 * oldest-first; `backward` yields them newest-first. Windows are contiguous (day-granular `after:`/
 * `before:` is exclusive at the upper bound), so every day in the range is covered exactly once.
 */
const generateDateRanges = (config: DateRange): Stream.Stream<DateChunk> =>
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
      { concurrency: STREAMING_CONFIG.messageFetchConcurrency },
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
