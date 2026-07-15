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
 * Runs the JMAP sync pipeline for a binding. Every run is bidirectional: new mail since the cursor's
 * `max` (ascending) plus backfill from `min` down to the horizon (descending), so an interrupted or
 * capped run resumes both halves from the cursor — the only durable state (see `Cursor.resolveWindows`).
 * Requires `JmapMailApi` rather than providing it, so a test can drive the sync against a mock API; the
 * handler below wraps it with the Live layer. Return type is written out (not inferred) so the `.d.ts`
 * can name it without expanding unnameable cross-package types (TS2883). Mirrors `runGmailSync`.
 */
export const runJmapSync = ({
  binding: bindingRef,
  maxMessages = JMAP_SYNC_CONFIG.maxItemsPerRun,
  dedupSeedTail,
}: {
  binding: Ref.Ref<Cursor.Cursor>;
  /** Caps candidate messages per run before requesting `Operation.runAgain()`. Test-only override. */
  maxMessages?: number;
  /** Overrides the dedup-set seed bound (see `Cursor.layer`). Test-only — shrinks it to reproduce the seed-eviction dedup bug. */
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
    // Pool already-sent drafts once; `EmailStage.reconcileDrafts` drops each draft when its canonical copy arrives.
    const draftPool = yield* EmailStage.queryDraftPool(mailbox);

    // TODO(wittjosiah): Migrate this folder→Tag sync onto a pipeline (source: folders; sink: find-or-create Tag).
    // Build a folder-id → tag-uri map — mirrors Gmail's `syncLabels`.
    const { list: folders } = yield* api.mailboxGet(target);
    const folderTagMap = new Map<string, string>();
    for (const folder of folders) {
      const tag = yield* Effect.promise(() => Mailbox.findOrCreateJmapTag(db, { id: folder.id, name: folder.name }));
      folderTagMap.set(folder.id, Mailbox.tagUri(tag));
    }

    const options = readBindingOptions(binding);
    // `max`/`min` are the newest/oldest committed `receivedAt` (epoch-ms) — see `Cursor.resolveWindows`.
    const now = new Date();
    const horizon = Cursor.resolveHorizon({ now, syncBackDays: options.syncBackDays });
    const maxKey = Cursor.parseKey(binding.max);
    const minKey = Cursor.parseKey(binding.min);
    const windows = Cursor.resolveWindows({ maxKey, minKey, now, horizon });

    // Resolve the sender contact, build the ECHO message, and map folder ids to tag URIs.
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

    // The per-run cap is applied *after* dedup so it counts only genuinely-new messages — capping before
    // dedup would let re-fetched boundary messages stall the cursor. `scanned` distinguishes a truncated
    // run (→ re-run) from both windows exhausted (→ complete backfill).
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
          maxKey,
          minKey,
          trackRange: true,
          stats,
          dedupSeedTail,
        }),
      ),
    );

    // Flush indexes once at run end so cross-run dedup / contact resolution observe this run's writes.
    yield* Database.flush({ indexes: true });

    if (scanned < maxMessages) {
      // Both halves exhausted (not capped) — backward reached the horizon.
      Cursor.completeBackfill(binding, horizon.getTime());
    } else {
      // Capped: more to sync. Re-run rather than loop in-process, to bound this invocation and let the
      // durable runtime schedule the continuation; progress is committed above, so it resumes from the cursor.
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
 * Downloads each attachment's bytes. A failed download (incl. no `downloadUrl`) is logged and dropped
 * rather than failing the whole message.
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
 * Streams JMAP email ids over a {@link Cursor.Window}: build the query filter (folder scope + date
 * bounds + optional user DSL), then paginate. Forward pages oldest-first from `max` so a capped run
 * advances `max` gap-free instead of jumping to the newest key and stranding the middle; backward pages
 * newest-first from `min` to the horizon. Backward's upper bound is queried 1ms past `min` so a message
 * sharing that exact millisecond is re-queried (and deduped) rather than skipped once `min` passes it.
 * Split from the full-email fetch so a bidirectional run can cap the combined id stream before fetching.
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
      // Bound the query to the window. Backward's `end` is `min` — extend 1ms to include the boundary
      // millisecond (see doc above).
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
 * Fetches the full JMAP email for each id. Takes a plain id stream (not a window) so a bidirectional
 * run can cap the combined stream once, then fetch full emails for exactly the capped set.
 */
const jmapEmailsForIds = (
  target: JmapMail.Target,
  ids: Stream.Stream<string, JmapApiError, JmapMailApi | Cursor.Service>,
): Stream.Stream<JmapMail.Email, JmapApiError, JmapMailApi | Cursor.Service> =>
  ids.pipe(
    Stream.flatMap(
      (id) =>
        // Drop an id deleted between query and `emailGet` (returns nothing) by filtering out the null.
        // Do NOT recover the error channel: a real `JmapApiError` must propagate and fail the run so the
        // durable retry re-fetches, rather than stranding the message once `max` advances.
        Stream.fromEffect(
          Effect.gen(function* () {
            const api = yield* JmapMailApi;
            const { list } = yield* api.emailGet(target, [id]);
            return list[0];
          }),
        ).pipe(Stream.filter(Predicate.isNotNullable)),
      { concurrency: JMAP_SYNC_CONFIG.fetchConcurrency, bufferSize: 10 },
    ),
  );

/**
 * Streams full JMAP emails for one bidirectional run: forward window's ids then backward's, concatenated
 * and fetched in full. Intentionally UNBOUNDED — the caller caps after dedup (see `runJmapSync`).
 *
 * `Cursor.skipCommitted` drops ids already in the dedup set before `emailGet`, so re-queried boundary
 * ids aren't downloaded; the caller's post-fetch `Cursor.dedupStage` stays the authority.
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
