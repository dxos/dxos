//
// Copyright 2026 DXOS.org
//

import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { format } from 'date-fns';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Predicate from 'effect/Predicate';
import * as Stream from 'effect/Stream';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Obj, Ref } from '@dxos/echo';
import { type EntityNotFoundError } from '@dxos/echo/Err';
import { type Resolver, resolve } from '@dxos/extractor';
import * as InboxResolver from '@dxos/extractor-lib';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
import { EmailStage } from '@dxos/pipeline-email';
import { ContentBlock, Person } from '@dxos/types';

import { Jmap, JmapMail } from '../../../apis';
import { JMAP_MESSAGE_SOURCE } from '../../../constants';
import { type JmapApiError } from '../../../errors';
import { meta } from '../../../meta';
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
 * Progress-registry key for a mailbox's JMAP sync monitor — the mailbox URI plus `#sync` so distinct
 * monitor types (e.g. `#topics`) can coexist for one mailbox. `MailboxArticle` subscribes to show the
 * sync meter. Mirrors Gmail's `createSyncProgressKey`.
 */
export const createSyncProgressKey = (mailbox: Mailbox.Mailbox) => Obj.getURI(mailbox).toString() + '#sync';

export type RunJmapSyncProps = {
  binding: Ref.Ref<Cursor.Cursor>;
  /** Caps candidate messages per run before requesting `Operation.runAgain()`. Test-only override. */
  maxMessages?: number;
  /** Reference "now" for window/horizon resolution. Test-only (pins the clock); defaults to `new Date()`. */
  now?: Date;
  /** Overrides the dedup-set seed bound (see `Cursor.layer`). Test-only — shrinks it to reproduce the seed-eviction dedup bug. */
  dedupSeedTail?: number;
};

/**
 * Runs the JMAP sync pipeline for a binding. Every run is bidirectional: new mail since the cursor's
 * `max` (ascending) plus backfill from `min` down to the horizon (descending), so an interrupted or
 * capped run resumes both halves from the cursor — the only durable state (see `Cursor.resolveWindows`).
 * Requires `JmapMailApi` rather than providing it, so a test can drive the sync against a mock API; the
 * handler below wraps it with the Live layer. Return type is written out (not inferred) so the `.d.ts`
 * can name it without expanding unnameable cross-package types (TS2883). Mirrors `syncGmail`.
 */
export const runJmapSync = ({
  binding: bindingRef,
  maxMessages = JMAP_SYNC_CONFIG.maxItemsPerRun,
  now = new Date(),
  dedupSeedTail,
}: RunJmapSyncProps): Effect.Effect<
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

    const targetOptions = readBindingOptions(binding);
    // `max`/`min` are the newest/oldest committed `receivedAt` (epoch-ms) — see `Cursor.resolveWindows`.
    const horizon = Cursor.resolveHorizon({ now, syncBackDays: targetOptions.syncBackDays });
    const maxKey = Cursor.parseKey(binding.max);
    const minKey = Cursor.parseKey(binding.min);
    const windows = Cursor.resolveWindows({ maxKey, minKey, now, horizon });

    const formatWindow = (window: Cursor.Window | undefined) =>
      window && { start: format(window.start, 'yyyy-MM-dd'), end: format(window.end, 'yyyy-MM-dd') };
    log.info('syncing...', {
      mailbox: Obj.getURI(mailbox),
      maxKey,
      minKey,
      forward: formatWindow(windows.forward),
      backward: formatWindow(windows.backward),
    });

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

    // Coarse sync telemetry written to the transient stats store (keyed by mailbox) for a live debug
    // surface. Optional — `getAll` yields nothing without a host plugin, so a no-op in production.
    // Write only this plugin's compartment; other plugins own their own slots.
    const statsCompartments = (yield* Capability.getAll(AppCapabilities.StatsPanel)).map((store) =>
      store.compartment(meta.profile.key),
    );

    // Cooperative cancellation: the meter's cancel control aborts the controller, which drains the
    // stream so the run stops without error.
    const controller = new AbortController();

    // Live progress monitor, keyed by the mailbox URI so surfaces can subscribe. The registry is a
    // singleton from an always-loaded host; absence is a wiring bug, not a typed failure — `orDie`
    // keeps the error channel provider-scoped.
    const progressRegistry = yield* Capability.get(AppCapabilities.ProgressRegistry).pipe(Effect.orDie);
    const progressMonitor = progressRegistry.register(createSyncProgressKey(mailbox), {
      label: mailbox.name ?? 'Mailbox',
      onCancel: () => {
        controller.abort();
      },
    });

    // Accumulate the retrieval total as each page's ids are enumerated (before any full fetch), so the
    // meter renders a determinate bar. Pages enumerate before their ids reach fetch, so `total` leads
    // `current`.
    let totalToRetrieve = 0;
    const addToTotal = (count: number) => {
      totalToRetrieve += count;
      progressMonitor.total(totalToRetrieve);
    };

    const startedAt = new Date().toISOString();
    const startMs = Date.now();
    const threads = new Set<string>();
    const senders = new Set<string>();
    const coverage = { plain: 0, synthesizedMarkdown: 0, htmlOnly: 0, none: 0 };

    // Per-run funnel counts, each stage narrower than the last: `taken` (post-dedup candidates — the
    // cap gauge) → `processed` (post-decode/map) → `stats.newMessages` (committed). `extent` is the
    // observed key range, folded into the cursor at run end so a run that commits nothing still advances.
    let taken = 0;
    let processed = 0;
    let attachmentCount = 0;
    let finishedAt: string | undefined;
    let finishedMs: number | undefined;
    const extent: Cursor.Extent = { maxKey: 0, minKey: 0 };
    const publishStats = () => {
      if (statsCompartments.length === 0) {
        return;
      }

      const snapshot = {
        startedAt,
        ...(finishedAt ? { finishedAt } : {}),
        durationMs: (finishedMs ?? Date.now()) - startMs,
        range: {
          syncBackDays: targetOptions.syncBackDays,
          forward: formatWindow(windows.forward),
          backward: formatWindow(windows.backward),
        },
        taken,
        processed,
        newMessages: stats.newMessages,
        threads: threads.size,
        senders: senders.size,
        coverage,
        attachments: attachmentCount,
      };

      statsCompartments.forEach((compartment) => compartment.set(snapshot));
    };

    // Pass-through stage: accumulates telemetry per mapped message, publishing a snapshot so a
    // subscribed surface ticks up live.
    const collectStats = Stage.map('collect-stats', (mapped: EmailStage.Mapped) =>
      Effect.sync(() => {
        processed += 1;
        if (mapped.message.threadId) {
          threads.add(mapped.message.threadId);
        }
        if (mapped.message.sender?.email) {
          senders.add(mapped.message.sender.email);
        }
        const textBlocks = mapped.message.blocks.filter((block): block is ContentBlock.Text => block._tag === 'text');
        const has = (mimeType: string) => textBlocks.some((block) => block.mimeType === mimeType);
        if (has('text/plain')) {
          coverage.plain += 1;
        } else if (has('text/markdown')) {
          coverage.synthesizedMarkdown += 1;
        } else if (has('text/html')) {
          coverage.htmlOnly += 1;
        } else {
          coverage.none += 1;
        }
        attachmentCount += mapped.attachments?.length ?? 0;
        publishStats();
        return mapped;
      }),
    );

    //
    // Start pipeline
    //
    // `jmapEmails` covers both halves as one unbounded stream; the per-run cap is applied *after* dedup
    // so it counts only genuinely-new messages — capping before dedup would let re-fetched boundary
    // messages stall the cursor. `taken` distinguishes a truncated run (→ re-run) from both windows
    // exhausted (→ complete backfill).
    yield* jmapEmails(target, folders, {
      windows,
      filter: targetOptions.filter,
      now,
      onEnumerated: addToTotal,
      // Advance at retrieval so `current` reaches `total`; counting after downstream dedup/decode drops
      // would leave the bar short of 100%.
      onRetrieved: () => progressMonitor.advance(1),
    }).pipe(
      Cursor.dedupStage<JmapMail.Email>(
        'dedup',
        (email) => email.id,
        (email) => new Date(email.receivedAt).getTime(),
      ),
      Stream.take(maxMessages),
      Stream.tap(() => Effect.sync(() => (taken += 1))),
      decodeBodyStage,
      mapToMessageStage,
      EmailStage.processAttachments(),
      onArrivalExtractors(mailbox),
      EmailStage.extractContacts(),
      EmailStage.reconcileDrafts(draftPool),
      collectStats,
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
          extent,
          dedupSeedTail,
        }),
      ),
      Pipeline.abortWith(
        controller.signal,
        // TODO(wittjosiah): Could this note+remove pairing be upstreamed into abortWith itself?
        Effect.sync(() => {
          log('jmap sync cancelled', { mailbox: Obj.getURI(mailbox) });
          progressMonitor.note('Cancelled');
          progressMonitor.remove();
        }),
      ),
      Effect.tapError((error) =>
        Effect.sync(() => {
          // Log the raw error; the meter shows only a short reason (the full exception — provider
          // errors, auth tokens — must not reach the UI).
          log.warn('jmap sync failed', { error });
          progressMonitor.fail('Sync failed');
        }),
      ),
    );

    // Flush indexes once at end of run so cross-run dedup / contact resolution observe this run's writes
    // (per-page commits no longer flush — see `Cursor.commit`).
    yield* Database.flush({ indexes: true });

    // Final publish so the committed `newMessages` count and the run's end time / duration are recorded
    // after the last mid-stream snapshot.
    finishedMs = Date.now();
    finishedAt = new Date(finishedMs).toISOString();
    publishStats();

    // On cancel, `Pipeline.abortWith`'s onAbort already noted 'Cancelled' and removed the monitor, so
    // only the completed path has post-run work.
    if (!controller.signal.aborted) {
      progressMonitor.done();
      progressMonitor.remove();

      // Fold the run's observed key extent so the window advances even if every scanned message was
      // dedup-dropped (e.g. a crash orphaned feed appends) — prevents an identical re-scan / infinite re-run.
      Cursor.extendRange(binding, extent);

      const capped = taken >= maxMessages;
      log('jmap sync run finished', {
        mailbox: Obj.getURI(mailbox),
        taken,
        maxMessages,
        capped,
        newMessages: stats.newMessages,
        action: capped ? 'runAgain' : 'completeBackfill',
      });
      if (!capped) {
        // Both halves exhausted naturally (not just capped) — the backward half reached the horizon.
        Cursor.completeBackfill(binding, horizon.getTime());
      } else {
        // Capped: more to sync. A re-run (rather than an in-process loop) keeps this invocation bounded
        // and lets the durable runtime schedule the continuation. Progress is already committed, so the
        // next run resumes from the advanced cursor.
        yield* Operation.runAgain().pipe(Effect.orDie);
      }
    }

    log('sync complete', { newMessages: stats.newMessages, cancelled: controller.signal.aborted, taken });
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
 * Streams full JMAP emails for one bidirectional run: forward window's ids then backward's, concatenated
 * and fetched in full. Intentionally UNBOUNDED — the caller caps after dedup (see `runJmapSync`).
 *
 * `Cursor.skipCommitted` drops ids already in the dedup set before `emailGet`, so re-queried boundary
 * ids aren't downloaded; the caller's post-fetch `Cursor.dedupStage` stays the authority.
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
  },
): Stream.Stream<JmapMail.Email, JmapApiError, JmapMailApi | Cursor.Service> => {
  const idsFor = (window: Cursor.Window | undefined) =>
    window
      ? jmapIds(target, folders, window, { filter: config.filter, now: config.now, onEnumerated: config.onEnumerated })
      : Stream.empty;

  return jmapEmailsForIds(
    target,
    Stream.concat(idsFor(config.windows.forward), idsFor(config.windows.backward)).pipe(
      Cursor.skipCommitted('skip-committed', (id) => id),
    ),
    { onRetrieved: config.onRetrieved },
  );
};
