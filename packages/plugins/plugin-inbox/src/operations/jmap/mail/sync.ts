//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';
import * as Stream from 'effect/Stream';

import { type Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { type EntityNotFoundError } from '@dxos/echo/Err';
import { type Resolver, resolve } from '@dxos/extractor';
import * as InboxResolver from '@dxos/extractor-lib';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
import { EmailStage } from '@dxos/pipeline-email';
import { Person } from '@dxos/types';

import { Jmap, JmapMail } from '../../../apis';
import { JMAP_MESSAGE_SOURCE } from '../../../constants';
import { type JmapApiError } from '../../../errors';
import { JmapCredentials, JmapMailApi } from '../../../services';
import { InboxOperation, Mailbox, type SyncStreamConfig } from '../../../types';
import { onArrivalExtractors, readBindingOptions } from '../../../util';
import { type AttachmentMetadata, type DecodedEmail, decodeBody, mapToMessage } from './mapper';

const MAIL_ACCOUNT_CAPABILITY = 'urn:ietf:params:jmap:mail';

/** JMAP mail's streaming-pipeline tuning; see {@link SyncStreamConfig}. */
const JMAP_SYNC_CONFIG = {
  listPageSize: 50,
  fetchConcurrency: 5,
  commitPageSize: 10,
  maxItemsPerRun: 500,
} as const satisfies SyncStreamConfig;

/**
 * Runs the JMAP sync pipeline for a binding against the {@link JmapMailApi} service (plus the ambient
 * operation services). Every run is bidirectional: it syncs new mail since the cursor's `high`
 * watermark (ascending) and continues backfilling from `low` down to the sync horizon (descending), so
 * an interrupted or capped run always resumes both halves from exactly where it left off — the cursor
 * is the only durable state (see `@dxos/link`'s `Cursor.resolveWindows`). It *requires* the service
 * rather than providing HTTP/credentials itself, so a test can drive the whole sync against a mock
 * JMAP API + a real ECHO db — the operation handler below wraps it with the Live layer. The return
 * type is written out (not inferred) so the module's emitted `.d.ts` can name it without the compiler
 * expanding unnameable cross-package types (TS2883); the deployed operation stays portable via
 * `Operation.opaqueHandler`. Mirrors `runGmailSync`.
 */
export const runJmapSync = ({
  binding: bindingRef,
  maxMessages = JMAP_SYNC_CONFIG.maxItemsPerRun,
  dedupSeedTail,
}: {
  binding: Ref.Ref<Cursor.Cursor>;
  /**
   * Caps how many candidate messages this run considers before requesting `Operation.runAgain()` to
   * pick up where it left off. Test-only override — production always uses the default.
   */
  maxMessages?: number;
  /**
   * Overrides the dedup-set seed bound (see `Cursor.layer`). Test-only, so a test can shrink it to
   * reproduce the seed-eviction dedup bug without a 500+ message dataset; production uses the default.
   */
  dedupSeedTail?: number;
}): Effect.Effect<
  { newMessages: number },
  JmapApiError | EntityNotFoundError,
  JmapMailApi | Database.Service | Resolver | Capability.Service | Operation.Service
> =>
  Effect.gen(function* () {
    const binding = yield* Database.load(bindingRef);
    if (!Cursor.isExternal(binding)) {
      return { newMessages: 0 };
    }
    const mailbox = yield* Database.load(binding.spec.target);
    if (!Mailbox.instanceOf(mailbox)) {
      log.warn('jmap sync skipped: binding target is not a Mailbox', { typename: Obj.getTypename(mailbox) });
      return { newMessages: 0 };
    }

    const api = yield* JmapMailApi;
    const session = yield* api.getSession;
    const accountId = session.primaryAccounts[MAIL_ACCOUNT_CAPABILITY];
    if (!accountId) {
      log.warn('jmap sync: session has no mail account', { username: session.username });
      return { newMessages: 0 };
    }
    const target: JmapMail.Target = { apiUrl: session.apiUrl, accountId, downloadUrl: session.downloadUrl };
    log('jmap sync: session resolved', { apiUrl: session.apiUrl, accountId });

    const { db } = yield* Database.Service;
    const feed = yield* Database.load(mailbox.feed);
    const tagIndex = yield* Database.load(mailbox.tags);
    // Pool already-sent drafts once for this run; `EmailStage.reconcileDrafts` matches each incoming
    // message against it so the canonical copy's arrival removes its now-redundant draft in the commit.
    const draftPool = yield* EmailStage.queryDraftPool(mailbox);

    // TODO(wittjosiah): Migrate this folder→Tag sync onto a pipeline too (source: folders; sink:
    //   find-or-create Tag), rather than the imperative loop below.
    // Build a folder-id → tag-uri map — mirrors Gmail's `syncLabels`.
    const { list: folders } = yield* api.mailboxGet(target);
    const folderTagMap = new Map<string, string>();
    for (const folder of folders) {
      const tag = yield* Effect.promise(() => Mailbox.findOrCreateJmapTag(db, { id: folder.id, name: folder.name }));
      folderTagMap.set(folder.id, Mailbox.tagUri(tag));
    }

    const options = readBindingOptions(binding);
    // `high`/`low` are the newest/oldest committed `receivedAt` (epoch-ms) — see `Cursor.resolveWindows`.
    const now = new Date();
    const horizon = Cursor.resolveHorizon({ now, syncBackDays: options.syncBackDays });
    const highKey = Cursor.parseKey(binding.high);
    const lowKey = Cursor.parseKey(binding.low);
    const windows = Cursor.resolveWindows({ highKey, lowKey, now, horizon });

    // Resolve the sender contact, build the ECHO message, and resolve folder ids to tag URIs via the
    // (JMAP-specific) folder map captured here.
    const mapToMessageStage: Stage.Stage<DecodedEmail, EmailStage.Mapped, never, Resolver | JmapMailApi> = Stage.map(
      'map-to-message',
      (decoded: DecodedEmail) =>
        Effect.gen(function* () {
          const fromAddress = decoded.raw.from?.[0];
          const contact = fromAddress ? yield* resolve(Person.Person, { email: fromAddress.email }) : undefined;
          const mapped = mapToMessage(decoded, contact ?? undefined);
          if (!mapped) {
            return undefined;
          }
          const tagUris = mapped.mailboxIds.flatMap((folderId) => {
            const uri = folderTagMap.get(folderId);
            return uri ? [uri] : [];
          });
          const attachments = yield* fetchAttachments(target, decoded.attachments);
          return {
            message: mapped.message,
            foreignId: decoded.raw.id,
            key: new Date(decoded.raw.receivedAt).getTime(),
            tagUris,
            attachments,
          };
        }),
    );

    const stats: Cursor.Stats = { newMessages: 0 };

    // `jmapEmails` covers both halves (new mail forward + backfill backward) as one unbounded stream; the
    // per-run cap is applied *after* dedup so it counts only genuinely-new messages (mirrors Gmail — the
    // windows re-fetch each boundary's already-synced messages, so capping before dedup could stall the
    // cursor). `scanned` (new messages this run) tells us whether the cap truncated the run (→ re-run) or
    // both windows were exhausted (→ complete the backfill); `Stream.take` halts fetch once the quota is met.
    let scanned = 0;
    yield* jmapEmails(target, folders, { windows, filter: options.filter }).pipe(
      Cursor.dedupStage<JmapMail.Email>(
        'dedup',
        (email) => email.id,
        (email) => new Date(email.receivedAt).getTime(),
      ),
      Stream.take(maxMessages),
      Stream.tap(() => Effect.sync(() => (scanned += 1))),
      decodeBodyStage,
      mapToMessageStage,
      EmailStage.processAttachments(),
      onArrivalExtractors(mailbox),
      EmailStage.extractContacts(),
      EmailStage.reconcileDrafts(draftPool),
      EmailStage.toCommitUnit({ tagIndex }),
      Stream.grouped(JMAP_SYNC_CONFIG.commitPageSize),
      Pipeline.run({ sink: Cursor.commit }),
      Effect.provide(
        Cursor.layer({
          cursor: binding,
          feed,
          foreignKeySource: JMAP_MESSAGE_SOURCE,
          highKey,
          lowKey,
          trackRange: true,
          stats,
          dedupSeedTail,
        }),
      ),
    );

    // Flush indexes once at the end of the run (per-page commits no longer flush — see
    // `Cursor.commit`) so cross-run dedup / contact resolution observe this run's writes.
    yield* Database.flush({ indexes: true });

    if (scanned < maxMessages) {
      // Both halves exhausted naturally (not just capped) — the backward half reached the horizon.
      Cursor.completeBackfill(binding, horizon.getTime());
    } else {
      // Capped: there is more to sync. Requesting a re-run — rather than looping in-process — keeps
      // this invocation's duration bounded and lets the durable runtime schedule the continuation
      // (the trigger dispatcher re-queues it; `sync-connection` re-invokes it in-app). Progress is
      // already committed and flushed above, so the next run picks up from the advanced cursor.
      yield* Operation.runAgain().pipe(Effect.orDie);
    }

    log('jmap sync complete', { newMessages: stats.newMessages, scanned });
    return { newMessages: stats.newMessages };
  }).pipe(Effect.withSpan('jmap-sync'));

export default InboxOperation.JmapSync.pipe(
  Operation.withHandler(({ binding: bindingRef }) =>
    Effect.gen(function* () {
      const bindingObj = bindingRef.target;
      const db = bindingObj ? Obj.getDatabase(bindingObj) : undefined;
      if (!bindingObj || !db || !Cursor.isExternal(bindingObj)) {
        log.warn('jmap sync skipped: missing binding target or database', {
          hasBinding: Boolean(bindingObj),
          hasDatabase: Boolean(db),
        });
        return { newMessages: 0 };
      }

      const accessTokenRef = bindingObj.spec.source;

      return yield* runJmapSync({ binding: bindingRef }).pipe(
        Effect.provide(
          Layer.mergeAll(
            JmapMailApi.Live.pipe(
              Layer.provide(Layer.mergeAll(FetchHttpClient.layer, JmapCredentials.fromAccessToken(accessTokenRef))),
            ),
            InboxResolver.Live,
          ),
        ),
      );
    }),
  ),
  Operation.opaqueHandler,
);

/** JMAP-specific decode stage: extract the body text; drop emails with no body. */
const decodeBodyStage: Stage.Stage<JmapMail.Email, DecodedEmail, never, never> = Stage.map(
  'decode-body',
  (email: JmapMail.Email) => Effect.sync(() => decodeBody(email) ?? undefined),
);

/**
 * Downloads each attachment's bytes via `JmapMailApi.downloadBlob`. One failed download (including a
 * session with no `downloadUrl`) is logged and dropped rather than failing the whole message.
 */
const fetchAttachments = (
  target: JmapMail.Target,
  attachments: readonly AttachmentMetadata[],
): Effect.Effect<readonly EmailStage.Attachment[], never, JmapMailApi> =>
  Effect.gen(function* () {
    const api = yield* JmapMailApi;
    const fetched = yield* Effect.forEach(
      attachments,
      (attachment) =>
        api.downloadBlob(target, attachment.blobId, { name: attachment.name, type: attachment.mimeType }).pipe(
          Effect.map(
            (bytes): EmailStage.Attachment => ({
              name: attachment.name,
              mimeType: attachment.mimeType,
              size: attachment.size ?? bytes.byteLength,
              bytes,
              contentId: attachment.contentId,
            }),
          ),
          Effect.catchAll((error) => {
            log.catch(error, { blobId: attachment.blobId, name: attachment.name });
            return Effect.succeed(undefined);
          }),
        ),
      { concurrency: JMAP_SYNC_CONFIG.fetchConcurrency },
    );
    return fetched.filter((attachment): attachment is EmailStage.Attachment => attachment !== undefined);
  });

/**
 * Streams JMAP email ids over the resolved {@link Cursor.Window}: build the query filter (folder scope
 * + `after`/`before` date bounds + optional user DSL), then paginate ids. Direction is realized via
 * both the window's bounds and the query's sort order — forward resumes from `high` and pages
 * oldest-first, so a capped run advances `high` gap-free instead of jumping straight to the newest key
 * and stranding the older, unprocessed middle; backward pages newest-first from `low` down to the
 * horizon. The backward window's upper bound is queried 1ms past `low` (`window.end`) so a message
 * sharing that exact millisecond is re-queried — and resolved by the dedup set — rather than silently
 * skipped now that `low` has advanced past it. Split from the full-email fetch so a caller syncing both
 * halves of a bidirectional run can concatenate two id streams (one per window) and cap the combined
 * total *before* paying for a full-email fetch — see `runJmapSync`.
 */
const jmapIds = (
  target: JmapMail.Target,
  folders: readonly JmapMail.Mailbox[],
  window: Cursor.Window,
  options: { filter?: string },
): Stream.Stream<string, JmapApiError, JmapMailApi> =>
  Stream.unwrap(
    Effect.gen(function* () {
      const api = yield* JmapMailApi;

      const userFilter = options.filter
        ? JmapMail.parseMailQuery(options.filter, {
            now: new Date(),
            resolveMailbox: (nameOrRole) => JmapMail.resolveMailboxByNameOrRole(folders, nameOrRole),
          })
        : Option.none<Jmap.Filter>();
      // When the user filter already scopes a mailbox, skip the default folder restriction.
      const scopesMailbox = Option.match(userFilter, { onNone: () => false, onSome: JmapMail.filterScopesMailbox });
      // Default to all mail (every folder incl. Sent) so full conversations sync, excluding Trash/Junk/Drafts.
      const excludedFolderIds = folders
        .filter((folder) => folder.role === 'trash' || folder.role === 'junk' || folder.role === 'drafts')
        .map((folder) => folder.id);

      const conditions: Jmap.Filter[] = [];
      if (!scopesMailbox && excludedFolderIds.length > 0) {
        conditions.push({ inMailboxOtherThan: excludedFolderIds });
      }
      // Bound the query to the window: `after` (>= high/horizon) and `before` (< end). The backward
      // window's `end` is `low` — extend it 1ms so the boundary millisecond is included (see doc above).
      const upperBound = window.direction === 'backward' ? new Date(window.end.getTime() + 1) : window.end;
      conditions.push({ after: window.start.toISOString() });
      conditions.push({ before: upperBound.toISOString() });
      if (Option.isSome(userFilter)) {
        conditions.push(userFilter.value);
      }
      const filter: Jmap.Filter = conditions.length === 1 ? conditions[0] : { operator: 'AND', conditions };
      log('starting jmap sync', {
        direction: window.direction,
        start: window.start.toISOString(),
        end: window.end.toISOString(),
        conditions: conditions.length,
      });

      return Stream.paginateChunkEffect(0, (position: number) =>
        Effect.gen(function* () {
          const { ids } = yield* api.emailQuery(target, {
            filter,
            sort: [{ property: 'receivedAt', isAscending: window.direction === 'forward' }],
            position,
            limit: JMAP_SYNC_CONFIG.listPageSize,
          });
          log('jmap sync: queried page', { position, total: ids.length });
          const next =
            ids.length < JMAP_SYNC_CONFIG.listPageSize ? Option.none<number>() : Option.some(position + ids.length);
          return [Chunk.fromIterable(ids), next];
        }),
      );
    }),
  );

/**
 * Fetches the full JMAP email for each id in `ids`, at the standard fetch concurrency. Takes a plain
 * id stream (rather than a window) so a caller syncing both halves of a bidirectional run can
 * concatenate and cap the combined id stream once, then fetch full emails for exactly the capped set.
 */
const jmapEmailsForIds = (
  target: JmapMail.Target,
  ids: Stream.Stream<string, JmapApiError, JmapMailApi | Cursor.Service>,
): Stream.Stream<JmapMail.Email, JmapApiError, JmapMailApi | Cursor.Service> =>
  ids.pipe(
    Stream.flatMap(
      (id) =>
        Stream.fromEffect(
          Effect.gen(function* () {
            const api = yield* JmapMailApi;
            const { list } = yield* api.emailGet(target, [id]);
            return list[0];
          }).pipe(Effect.filterOrFail(Predicate.isNotNullable, () => new Error(`email ${id} not found`))),
        ).pipe(Stream.orElse(() => Stream.empty)),
      { concurrency: JMAP_SYNC_CONFIG.fetchConcurrency, bufferSize: 10 },
    ),
  );

/**
 * Streams the full JMAP emails for one bidirectional sync run: the forward window's ids (cheap
 * `emailQuery`) then the backward window's, concatenated, each fetched in full (`emailGet`). Mirrors
 * Gmail's `fetchMessages` — the stream is intentionally UNBOUNDED; the caller caps it after dedup on
 * genuinely-new messages (see `runJmapSync`), and `Stream.take` there halts this stream's enumeration
 * and fetch once the quota is met.
 *
 * `Cursor.skipCommitted` drops ids already in the run's dedup set *before* `emailGet`, so a re-queried
 * boundary's already-synced ids aren't downloaded (the post-fetch `Cursor.dedupStage` in the caller
 * stays the authority for anything the bounded seed didn't cover).
 */
const jmapEmails = (
  target: JmapMail.Target,
  folders: readonly JmapMail.Mailbox[],
  config: { windows: Cursor.Windows; filter?: string },
): Stream.Stream<JmapMail.Email, JmapApiError, JmapMailApi | Cursor.Service> => {
  const idsFor = (window: Cursor.Window | undefined) =>
    window ? jmapIds(target, folders, window, { filter: config.filter }) : Stream.empty;

  return jmapEmailsForIds(
    target,
    Stream.concat(idsFor(config.windows.forward), idsFor(config.windows.backward)).pipe(
      Cursor.skipCommitted('skip-committed', (id) => id),
    ),
  );
};
