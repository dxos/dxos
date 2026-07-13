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
import { Database, Obj, Ref, Relation } from '@dxos/echo';
import { type EntityNotFoundError } from '@dxos/echo/Err';
import { type Resolver, resolve } from '@dxos/extractor';
import * as InboxResolver from '@dxos/extractor-lib';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
import { EmailStage } from '@dxos/pipeline-email';
import { Cursor, Person, SyncBinding } from '@dxos/types';

import { Jmap, JmapMail } from '../../../apis';
import { JMAP_MESSAGE_SOURCE } from '../../../constants';
import { type JmapApiError } from '../../../errors';
import { JmapCredentials, JmapMailApi } from '../../../services';
import { onArrivalExtractors } from '../../../sync';
import { InboxOperation, Mailbox } from '../../../types';
import { readBindingOptions } from '../../../util';
import { type AttachmentMetadata, type DecodedEmail, decodeBody, mapToMessage } from './mapper';

const MAIL_ACCOUNT_CAPABILITY = 'urn:ietf:params:jmap:mail';

// Number of email ids to query per page, emails fetched concurrently, and the commit page size.
const QUERY_PAGE_SIZE = 50;
const FETCH_CONCURRENCY = 5;
const COMMIT_PAGE_SIZE = 10;
const MAX_SCAN = 500;

/**
 * Runs the JMAP sync pipeline for a binding against the {@link JmapMailApi} service (plus the ambient
 * operation services). It *requires* the service rather than providing HTTP/credentials itself, so a
 * test can drive the whole sync against a mock JMAP API + a real ECHO db — the operation handler
 * below wraps it with the Live layer. The return type is written out (not inferred) so the module's
 * emitted `.d.ts` can name it without the compiler expanding unnameable cross-package types (TS2883);
 * the deployed operation stays portable via `Operation.opaqueHandler`. Mirrors `runGmailSync`.
 */
export const runJmapSync = ({
  binding: bindingRef,
  after,
  before,
  direction,
}: {
  binding: Ref.Ref<SyncBinding.SyncBinding>;
  /** Lower (oldest) bound of the range to sync — unix ms or yyyy-MM-dd. Defaults to the sync horizon. */
  after?: string | number;
  /** Upper (newest) bound of the range — unix ms or yyyy-MM-dd. Backfill passes the oldest-synced date here. */
  before?: string | number;
  /**
   * Override the walk direction. Default is inferred from the cursor: no cursor → `backward` (initial
   * sync); a cursor → `forward` (incremental). Pass `backward` (with `before` = oldest-synced) to backfill.
   */
  direction?: Cursor.SyncDirection;
}): Effect.Effect<
  { newMessages: number },
  JmapApiError | EntityNotFoundError,
  JmapMailApi | Database.Service | Resolver | Capability.Service | Operation.Service
> =>
  Effect.gen(function* () {
    const binding = yield* Database.load(bindingRef);
    const mailbox = Relation.getTarget(binding);
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

    // The cursor is the high-water `receivedAt` (epoch-ms) of the last committed email.
    const cursor = yield* Database.load(binding.cursor);
    const cursorKey = Cursor.parseKey(cursor.value);
    const options = readBindingOptions(binding);

    // Range + direction (shared with Gmail): no cursor → backward initial from today to the horizon;
    // cursor → forward incremental; `direction: backward` + `before` = oldest-synced → backfill.
    const window = Cursor.resolveSyncWindow({
      cursorKey,
      now: new Date(),
      after,
      before,
      direction,
      syncBackDays: options.syncBackDays,
    });

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

    const stats: SyncBinding.Stats = { newMessages: 0 };
    yield* jmapSource(target, folders, window, { filter: options.filter }).pipe(
      SyncBinding.dedupStage<JmapMail.Email>(
        'dedup',
        (email) => email.id,
        (email) => new Date(email.receivedAt).getTime(),
        { direction: window.direction },
      ),
      decodeBodyStage,
      mapToMessageStage,
      EmailStage.processAttachments(),
      onArrivalExtractors(mailbox),
      EmailStage.extractContacts(),
      EmailStage.reconcileDrafts(draftPool),
      EmailStage.toCommitUnit(),
      Stream.grouped(COMMIT_PAGE_SIZE),
      Pipeline.run({ sink: SyncBinding.commit }),
      Effect.provide(
        SyncBinding.layer({ binding, feed, tagIndex, foreignKeySource: JMAP_MESSAGE_SOURCE, cursorKey, stats }),
      ),
    );

    // Flush indexes once at the end of the run (per-page commits no longer flush — see
    // `SyncBinding.commit`) so cross-run dedup / contact resolution observe this run's writes.
    yield* Database.flush({ indexes: true });

    log('jmap sync complete', { newMessages: stats.newMessages });
    return { newMessages: stats.newMessages };
  }).pipe(Effect.withSpan('jmap-sync'));

export default InboxOperation.JmapSync.pipe(
  Operation.withHandler(({ binding: bindingRef, after, before, direction }) =>
    Effect.gen(function* () {
      const bindingObj = bindingRef.target;
      const db = bindingObj ? Obj.getDatabase(bindingObj) : undefined;
      if (!bindingObj || !db) {
        log.warn('jmap sync skipped: missing binding target or database', {
          hasBinding: Boolean(bindingObj),
          hasDatabase: Boolean(db),
        });
        return { newMessages: 0 };
      }

      const connectionRef = Ref.make(Relation.getSource(bindingObj));

      return yield* runJmapSync({ binding: bindingRef, after, before, direction }).pipe(
        Effect.provide(
          Layer.mergeAll(
            JmapMailApi.Live.pipe(
              Layer.provide(Layer.mergeAll(FetchHttpClient.layer, JmapCredentials.fromConnection(connectionRef))),
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
      { concurrency: FETCH_CONCURRENCY },
    );
    return fetched.filter((attachment): attachment is EmailStage.Attachment => attachment !== undefined);
  });

/**
 * Streams JMAP emails over the resolved {@link Cursor.SyncWindow}: build the query filter (folder scope +
 * `after`/`before` date bounds + optional user DSL), paginate ids (newest-first within the window),
 * then fetch each email. Direction is realized via the window's bounds — forward resumes from the
 * cursor, backward/backfill bounds the range with `before` — while the query is always newest-first.
 */
const jmapSource = (
  target: JmapMail.Target,
  folders: readonly JmapMail.Mailbox[],
  window: Cursor.SyncWindow,
  options: { filter?: string },
) =>
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
      // Bound the query to the window: `after` (>= horizon/cursor) and `before` (< end/oldest-synced).
      conditions.push({ after: window.start.toISOString() });
      conditions.push({ before: window.end.toISOString() });
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
            sort: [{ property: 'receivedAt', isAscending: false }],
            position,
            limit: QUERY_PAGE_SIZE,
          });
          log('jmap sync: queried page', { position, total: ids.length });
          const next = ids.length < QUERY_PAGE_SIZE ? Option.none<number>() : Option.some(position + ids.length);
          return [Chunk.fromIterable(ids), next];
        }),
      ).pipe(
        Stream.take(MAX_SCAN),
        Stream.flatMap(
          (id) =>
            Stream.fromEffect(
              api.emailGet(target, [id]).pipe(
                Effect.map(({ list }) => list[0]),
                Effect.filterOrFail(Predicate.isNotNullable, () => new Error(`email ${id} not found`)),
              ),
            ).pipe(Stream.orElse(() => Stream.empty)),
          { concurrency: FETCH_CONCURRENCY, bufferSize: 10 },
        ),
      );
    }),
  );
