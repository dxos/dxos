//
// Copyright 2026 DXOS.org
//

import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';
import * as Stream from 'effect/Stream';

import { type Resolver, resolve } from '@dxos/extractor';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { Stage } from '@dxos/pipeline';
import { EmailStage } from '@dxos/pipeline-email';
import { TagIndex } from '@dxos/schema';
import { Person } from '@dxos/types';

import { Jmap, JmapMail } from '../../../../apis';
import { JMAP_MESSAGE_SOURCE } from '../../../../constants';
import { type JmapApiError, MailSyncError } from '../../../../errors';
import { JmapMailApi } from '../../../../services';
import { Mailbox, SystemTags, type SyncStreamConfig } from '../../../../types';
import { type MailSyncItem, MailSyncProvider, type MailSyncSource, additionsToChanges } from '../../mail-sync';
import { type AttachmentMetadata, decodeBody, mapToMessage } from '../mapper';

const MAIL_ACCOUNT_CAPABILITY = 'urn:ietf:params:jmap:mail';

/** JMAP mail's streaming-pipeline tuning; see {@link SyncStreamConfig}. */
const JMAP_SYNC_CONFIG = {
  listPageSize: 50,
  fetchConcurrency: 5,
  commitPageSize: 10,
  maxItemsPerRun: 500,
} as const satisfies SyncStreamConfig;

/**
 * JMAP's {@link MailSyncProvider}: session/account discovery, the email source, the folder→tag map, and
 * the fused decode+map. Captures {@link JmapMailApi} + {@link Resolver} so the harness never names them.
 * Mirror of the Gmail provider (`googleMailSyncProvider`).
 */
export const jmapMailSyncProvider = (): Layer.Layer<MailSyncProvider, never, JmapMailApi | Resolver> =>
  Layer.effect(
    MailSyncProvider,
    Effect.gen(function* () {
      // The API is provided into the source stream (leaving `Cursor.Service` for the harness); the full
      // context into each `process` (whose only needs are API + resolver).
      const context = yield* Effect.context<JmapMailApi | Resolver>();
      const providerApi = yield* JmapMailApi;
      return {
        name: 'jmap',
        config: JMAP_SYNC_CONFIG,
        foreignKeySource: JMAP_MESSAGE_SOURCE,
        prepare: ({ db, binding, now, token }) =>
          Effect.gen(function* () {
            const api = yield* JmapMailApi;
            const session = yield* api.getSession;
            const accountId = session.primaryAccounts[MAIL_ACCOUNT_CAPABILITY];
            if (!accountId) {
              log.warn('jmap sync: session has no mail account', { username: session.username });
              return undefined;
            }
            const target: JmapMail.Target = { apiUrl: session.apiUrl, accountId, downloadUrl: session.downloadUrl };
            log('jmap sync: session resolved', { apiUrl: session.apiUrl, accountId });

            // TODO(wittjosiah): Migrate this folder→Tag sync onto a pipeline (source: folders; sink: find-or-create Tag).
            // Build a folder-id → tag-uri map — mirrors Gmail's `syncLabels`. A well-known role
            // (`inbox`/`sent`) maps onto the shared canonical system tag; a custom folder gets a
            // JMAP-scoped provider tag; a dropped role (`archive` — derived as "not in inbox";
            // `drafts`/`trash`/`junk` — not synced) produces no tag.
            const { list: folders } = yield* api.mailboxGet(target);
            const folderTagMap = new Map<string, string>();
            for (const folder of folders) {
              const canonical = folder.role ? SystemTags.JMAP_ROLE_TAGS[folder.role] : undefined;
              if (canonical) {
                const tag = yield* Effect.promise(() => SystemTags.findOrCreateSystemTag(db, canonical));
                folderTagMap.set(folder.id, Mailbox.tagUri(tag));
              } else if (folder.role) {
                continue;
              } else {
                const tag = yield* Effect.promise(() =>
                  Mailbox.findOrCreateJmapTag(db, { id: folder.id, name: folder.name }),
                );
                folderTagMap.set(folder.id, Mailbox.tagUri(tag));
              }
            }

            // Keyword → canonical system tag uri (only `$flagged`/starred today). Built once so the
            // initial map and the reconcile diff resolve the same tags.
            const keywordTagMap = new Map<string, string>();
            for (const [keyword, canonical] of Object.entries(SystemTags.JMAP_KEYWORD_TAGS)) {
              if (!canonical) {
                continue;
              }
              const tag = yield* Effect.promise(() => SystemTags.findOrCreateSystemTag(db, canonical));
              keywordTagMap.set(keyword, Mailbox.tagUri(tag));
            }

            // Fused decode + map; `undefined` drops the item (no body, or unmappable).
            const toMapped = (
              email: JmapMail.Email,
            ): Effect.Effect<EmailStage.Mapped | undefined, never, JmapMailApi | Resolver> =>
              Effect.gen(function* () {
                const decoded = decodeBody(email);
                if (!decoded) {
                  return undefined;
                }
                const fromAddress = decoded.raw.from?.[0];
                const contact = fromAddress ? yield* resolve(Person.Person, { email: fromAddress.email }) : undefined;
                const mapped = mapToMessage(decoded, contact ?? undefined);
                if (!mapped) {
                  return undefined;
                }
                const folderUris = mapped.mailboxIds.flatMap((folderId) => {
                  const uri = folderTagMap.get(folderId);
                  return uri ? [uri] : [];
                });
                const keywordUris = mapped.keywords.flatMap((keyword) => {
                  const uri = keywordTagMap.get(keyword);
                  return uri ? [uri] : [];
                });
                const tagUris = [...folderUris, ...keywordUris];
                const attachments = yield* fetchAttachments(target, decoded.attachments);
                return {
                  message: mapped.message,
                  foreignId: decoded.raw.id,
                  key: new Date(decoded.raw.receivedAt).getTime(),
                  tagUris,
                  attachments,
                };
              });

            const toItem = (email: JmapMail.Email): MailSyncItem => ({
              foreignId: email.id,
              key: new Date(email.receivedAt).getTime(),
              process: toMapped(email).pipe(Effect.provide(context)),
            });

            // Resolve the delta plan. First tick captures the current `Email/get` state before backfill
            // (so mail arriving during backfill is caught by the next incremental, not missed). An
            // incremental run fetches `Email/changes` since the token; a stale token
            // (`cannotCalculateChanges`) clears + recaptures and falls back to the window scan.
            let capturedToken: string | undefined = token;
            let createdIds: readonly string[] | undefined;
            let updatedIds: readonly string[] = [];
            if (token === undefined) {
              capturedToken = (yield* api.emailGet(target, [])).state;
            } else {
              const result = yield* Effect.either(api.emailChanges(target, token));
              if (Either.isRight(result)) {
                capturedToken = result.right.newState;
                createdIds = result.right.created;
                // `updated` are ids whose keywords/mailboxIds may have changed — re-fetched + diffed
                // against local tags in the reconcile branch. Exclude ids that are also newly created
                // (their full fetch already carries current tags).
                const created = new Set(result.right.created);
                updatedIds = result.right.updated.filter((id) => !created.has(id));
                log('jmap sync: incremental delta', {
                  created: result.right.created.length,
                  updated: result.right.updated.length,
                  destroyed: result.right.destroyed.length,
                });
              } else if (result.left.type === 'cannotCalculateChanges') {
                log('jmap sync: state token stale, falling back to window scan');
                Cursor.clearToken(binding);
                capturedToken = (yield* api.emailGet(target, [])).state;
              } else {
                return yield* Effect.fail(result.left);
              }
            }

            const source: MailSyncSource = {
              buildSource: ({ windows, filter, tagIndex, maxMessages, onEnumerated, onRetrieved, onTaken }) => {
                // Incremental replaces the forward window with the delta's created ids but keeps the
                // backward backfill window, so each tick still makes backfill progress.
                if (createdIds) {
                  onEnumerated(createdIds.length);
                }
                const additions = additionsToChanges(
                  jmapEmails(target, folders, { windows, filter, now, onEnumerated, onRetrieved, forwardIds: createdIds })
                    .pipe(
                      Stream.map(toItem),
                      Stream.provideService(JmapMailApi, providerApi),
                      Stream.mapError(MailSyncError.wrap()),
                    ),
                  { maxMessages, onTaken },
                );
                // Merge the label-change reconcile branch (empty on non-incremental runs).
                const reconciles = jmapReconcile(updatedIds, target, folderTagMap, keywordTagMap, tagIndex).pipe(
                  Stream.provideService(JmapMailApi, providerApi),
                  Stream.mapError(MailSyncError.wrap()),
                );
                return Stream.merge(additions, reconciles);
              },
              nextToken: () => capturedToken,
            };
            return source;
          }).pipe(Effect.provide(context), Effect.mapError(MailSyncError.wrap())),
      };
    }),
  );

/**
 * Reconcile branch for JMAP: for each `updated` email id, re-fetch its current `mailboxIds` + `keywords`,
 * map them to canonical/folder Tags, and diff against the message's current *local* tags — a remote-wins,
 * snapshot-free reconciliation that is idempotent (a re-run after a crash produces an empty diff, so it
 * is crash-safe). Emits a retag {@link EmailStage.Change} keyed by the resolved EntityId; ids not in the
 * feed (never synced / outside window) or with no net change are dropped.
 *
 * The two axes reconcile differently: **folder** tags are fully remote-wins (added *and* removed, since
 * folder membership is server-authoritative), while **keyword** tags (starred) are **add-only** — the
 * remote can add a star, but we never auto-remove one, which would clobber a locally-toggled star until
 * we support writing local flags back to the provider.
 */
const jmapReconcile = (
  updatedIds: readonly string[],
  target: JmapMail.Target,
  folderTagMap: ReadonlyMap<string, string>,
  keywordTagMap: ReadonlyMap<string, string>,
  tagIndex: TagIndex.TagIndex,
): Stream.Stream<EmailStage.Change, JmapApiError, JmapMailApi | Cursor.Service> => {
  const folderProviderUris = new Set(folderTagMap.values());
  return Stream.fromIterable(updatedIds).pipe(
    Stage.map('jmap-reconcile', (id: string) =>
      Effect.gen(function* () {
        const { foreignIndex } = yield* Cursor.Service;
        const entityId = foreignIndex?.get(id);
        if (!entityId) {
          return undefined;
        }
        const api = yield* JmapMailApi;
        const { list } = yield* api.emailGet(target, [id]);
        const email = list[0];
        if (!email) {
          return undefined;
        }
        const remoteFolderUris = (email.mailboxIds ? Object.keys(email.mailboxIds) : []).flatMap((folderId) => {
          const uri = folderTagMap.get(folderId);
          return uri ? [uri] : [];
        });
        const remoteKeywordUris = (
          email.keywords
            ? Object.entries(email.keywords)
                .filter(([, set]) => set)
                .map(([keyword]) => keyword)
            : []
        ).flatMap((keyword) => {
          const uri = keywordTagMap.get(keyword);
          return uri ? [uri] : [];
        });
        const localTags = TagIndex.bind(tagIndex).tags(entityId);
        const remoteFolders = new Set(remoteFolderUris);
        // Add any remote folder/keyword tag the message lacks.
        const addTagIds = [...remoteFolderUris, ...remoteKeywordUris].filter((tagUri) => !localTags.includes(tagUri));
        // Remove only folder tags the remote no longer has; user tags and starred are never auto-removed.
        const removeTagIds = localTags.filter(
          (tagUri) => folderProviderUris.has(tagUri) && !remoteFolders.has(tagUri),
        );
        if (addTagIds.length === 0 && removeTagIds.length === 0) {
          return undefined;
        }
        return { _tag: 'retag', foreignId: id, entityId, addTagIds, removeTagIds } satisfies EmailStage.Change;
      }),
    ),
  );
};

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
  options: {
    filter?: string;
    /** Reference "now" for the user filter's relative dates (pinned by tests). */
    now: Date;
    /** Called with each query page's enumerated id count, to accumulate the retrieval total. */
    onEnumerated?: (count: number) => void;
  },
): Stream.Stream<string, JmapApiError, JmapMailApi> =>
  Stream.unwrap(
    Effect.gen(function* () {
      const api = yield* JmapMailApi;

      const userFilter = options.filter
        ? JmapMail.parseMailQuery(options.filter, {
            now: options.now,
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
          // Report each page's count as it arrives so the meter's retrieval total leads the fetch.
          options.onEnumerated?.(ids.length);
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
  options: {
    /** Called once per email retrieved (full fetch), to advance progress. */
    onRetrieved?: () => void;
  } = {},
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
            options.onRetrieved?.();
            return list[0];
          }),
        ).pipe(Stream.filter(Predicate.isNotNullable)),
      { concurrency: JMAP_SYNC_CONFIG.fetchConcurrency, bufferSize: 10 },
    ),
  );

/**
 * Streams full JMAP emails for one run: the forward source's ids then the backward window's,
 * concatenated and fetched in full. Intentionally UNBOUNDED — the harness caps after dedup (see
 * `runMailSync`). The forward source is either the `max`-anchored forward window (first tick / stale
 * fallback) or, when `forwardIds` is set, the incremental delta's created ids — in which case the
 * backward window still runs, so an incremental tick keeps making backfill progress.
 *
 * `Cursor.skipCommitted` drops ids already in the dedup set before `emailGet`, so re-queried boundary
 * ids aren't downloaded; the harness's post-fetch `Cursor.dedupStage` stays the authority.
 */
const jmapEmails = (
  target: JmapMail.Target,
  folders: readonly JmapMail.Mailbox[],
  config: {
    windows: Cursor.Windows;
    filter?: string;
    now: Date;
    onEnumerated?: (count: number) => void;
    onRetrieved?: () => void;
    /** Incremental delta's created ids; when set, replaces the forward window (backward still runs). */
    forwardIds?: readonly string[];
  },
): Stream.Stream<JmapMail.Email, JmapApiError, JmapMailApi | Cursor.Service> => {
  const idsFor = (window: Cursor.Window | undefined) =>
    window
      ? jmapIds(target, folders, window, { filter: config.filter, now: config.now, onEnumerated: config.onEnumerated })
      : Stream.empty;
  const forward = config.forwardIds ? Stream.fromIterable(config.forwardIds) : idsFor(config.windows.forward);

  return jmapEmailsForIds(
    target,
    Stream.concat(forward, idsFor(config.windows.backward)).pipe(Cursor.skipCommitted('skip-committed', (id) => id)),
    { onRetrieved: config.onRetrieved },
  );
};
