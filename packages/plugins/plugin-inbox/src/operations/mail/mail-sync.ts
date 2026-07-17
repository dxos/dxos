//
// Copyright 2026 DXOS.org
//

import { format } from 'date-fns';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Capability } from '@dxos/app-framework';
import { PROGRESS_STATUS_CANCELLED, PROGRESS_STATUS_COMPLETE, PROGRESS_STATUS_FAILED } from '@dxos/app-toolkit';
import { Operation, Trace } from '@dxos/compute';
import { Database, Filter, Obj, type Ref } from '@dxos/echo';
import { type EntityNotFoundError } from '@dxos/echo/Err';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
import { EmailStage } from '@dxos/pipeline-email';
import { type TagIndex } from '@dxos/schema';
import { type ContentBlock, Message } from '@dxos/types';

import { MailSyncError } from '../../errors';
import { Mailbox, type SyncStreamConfig } from '../../types';
import { readBindingOptions } from '../../util';

/**
 * Provider-agnostic harness for a bidirectional, capped, resumable mail sync. The provider is an Effect
 * service ({@link MailSyncProvider}), so each operation is this one effect with its own provider layer
 * provided (see the gmail/jmap handlers). Owns everything not provider-specific: binding/mailbox/feed
 * loads, window resolution, the dedup→cap→process→commit pipeline, progress monitor, cancellation, stats.
 */

/**
 * Progress-registry key for a mailbox's mail-sync monitor — the mailbox URI plus `#sync` so distinct
 * monitor types (e.g. `#topics`) can coexist. `MailboxArticle` subscribes to show the sync meter.
 */
export const createSyncProgressKey = (mailbox: Mailbox.Mailbox) => Obj.getURI(mailbox).toString() + '#sync';

/** Options the harness passes to a provider's {@link MailSyncSource.buildSource} for one run. */
export type MailSyncSourceOptions = {
  /** Forward/backward windows this run covers (`Cursor.resolveWindows`); either may be absent. */
  readonly windows: Cursor.Windows;
  /** User search filter from the binding options (provider query DSL). */
  readonly filter?: string;
  /** The mailbox's tag index — a provider's reconcile branch reads it to diff remote vs local tags. */
  readonly tagIndex: TagIndex.TagIndex;
  /** Per-run cap on genuinely-new messages (additions) — the source applies it after dedup. */
  readonly maxMessages: number;
  /** Called with each enumeration page/chunk's id count, to accumulate the retrieval total. */
  readonly onEnumerated: (count: number) => void;
  /** Called once per item retrieved (full fetch), to advance progress. */
  readonly onRetrieved: () => void;
  /** Called once per genuinely-new message taken (post-dedup, pre-cap), so the harness can detect a capped run. */
  readonly onTaken: (count: number) => void;
};

/**
 * One candidate message: its dedup key fields plus a self-contained `process` effect. `process` fuses
 * the provider's decode + map (API + resolver already provided) into `EmailStage.Mapped`, or `undefined`
 * to drop the item (no body, filtered sender, unmappable). Fed through {@link additionsToChanges}, which
 * dedups on `foreignId`/`key` and caps before running `process`, so dedup/decode stay cheap.
 */
export type MailSyncItem = {
  readonly foreignId: string;
  readonly key: number;
  readonly process: Effect.Effect<EmailStage.Mapped | undefined, MailSyncError, never>;
};

/**
 * One reconcile change: a label add/remove on an already-committed message (or a stubbed deletion),
 * keyed by `foreignId`. {@link reconcileToChanges} resolves the `foreignId` to its feed message's
 * EntityId (via `Cursor.State.foreignIndex`) and produces an `EmailStage.Change`.
 */
export type ReconcileItem =
  | {
      readonly _tag: 'retag';
      readonly foreignId: string;
      readonly addTagIds: readonly string[];
      readonly removeTagIds: readonly string[];
    }
  | { readonly _tag: 'delete'; readonly foreignId: string };

/** The run's change source, produced by {@link MailSyncProviderService.prepare} once ready. */
export type MailSyncSource = {
  /**
   * Streams the run's changes (additions + reconcile) as a single `EmailStage.Change` stream. The
   * provider internalizes everything add-specific — the forward/backward windows, `skipCommitted`,
   * fetch, `dedupStage`, the `maxMessages` cap, and decode (via {@link additionsToChanges}) — and merges
   * in the reconcile branch (via {@link reconcileToChanges}), so the harness only pipes this through the
   * shared email tail. Requires only `Cursor.Service`; the provider's API is already captured.
   */
  readonly buildSource: (
    options: MailSyncSourceOptions,
  ) => Stream.Stream<EmailStage.Change, MailSyncError, Cursor.Service>;
  /**
   * The opaque delta-resume token at this run's chunk boundary (first-tick / staleness paths return the
   * freshly-captured provider token), read by the harness at run end and written to the cursor only after
   * the stream has fully drained. Advancing to a *chunk* boundary (not the whole delta) is what bounds a
   * run: a large delta is drained across runs. Absent for providers with no delta path.
   */
  readonly nextToken?: () => string | undefined;
  /**
   * The already-committed feed foreign ids this run's reconcile branch targets (JMAP `updated`, Gmail
   * label-change message ids). The harness resolves *only* these to EntityIds (see
   * `Cursor.LayerOptions.reconcileFilter`) rather than scanning the whole feed.
   */
  readonly reconcileForeignIds?: readonly string[];
  /**
   * Whether the provider has more delta beyond the chunk fetched this run. When true the harness requests
   * a durable `runAgain()` so reconciliation is bounded per run and resumed from the advanced token —
   * the same budget/re-run treatment additions already get.
   */
  readonly hasMoreDelta?: () => boolean;
};

/** Resolved run context the harness hands a provider's {@link MailSyncProviderService.prepare}. */
export type MailSyncPreparation = {
  readonly db: Database.Database;
  readonly binding: Cursor.ExternalCursor;
  readonly mailbox: Mailbox.Mailbox;
  /** Reference "now" for provider filters with relative dates (pinned by tests). */
  readonly now: Date;
  /** The cursor's current delta-resume token, or undefined on the first tick / after staleness. */
  readonly token?: string;
  /** Per-run budget — the provider bounds its delta chunk (JMAP `maxChanges`, Gmail `maxResults`) to it. */
  readonly maxMessages: number;
};

/** The provider-specific surface the shared harness runs against. */
export interface MailSyncProviderService {
  /** Provider tag for spans and logs (`gmail`, `jmap`); the run's span is `<name>-sync`. */
  readonly name: string;
  /** The provider's streaming-pipeline tuning (commit page size, per-run cap, …). */
  readonly config: SyncStreamConfig;
  /** Foreign-key source stamped on committed items (dedup key namespace). */
  readonly foreignKeySource: string;
  /**
   * Resolve the session/target and tag map, returning the run's source; `undefined` skips the run
   * (e.g. no mail account). Provider errors are wrapped into {@link MailSyncError}.
   */
  readonly prepare: (
    preparation: MailSyncPreparation,
  ) => Effect.Effect<MailSyncSource | undefined, MailSyncError, never>;
}

/**
 * Effect service carrying the provider a mail-sync run drives. A handler provides a layer whose
 * implementation captures the provider's API + resolver, so the shared harness never names them.
 */
export class MailSyncProvider extends Context.Tag('@dxos/plugin-inbox/MailSyncProvider')<
  MailSyncProvider,
  MailSyncProviderService
>() {}

/**
 * The add-specific head, shared by both providers: dedups raw candidates on foreignId/key, caps at
 * `maxMessages`, runs the provider decode, and wraps survivors as `upsert` changes. Providers apply this
 * inside `buildSource` (after their windows/list/skipCommitted/fetch) so the harness never manipulates
 * streams. `dedupStage`/`take`/decode are add-only — a retag targets an already-committed message — so
 * they live here rather than in the shared tail.
 */
export const additionsToChanges = (
  items: Stream.Stream<MailSyncItem, MailSyncError, Cursor.Service>,
  options: { readonly maxMessages: number; readonly onTaken: (count: number) => void },
): Stream.Stream<EmailStage.Change, MailSyncError, Cursor.Service> =>
  items.pipe(
    Cursor.dedupStage<MailSyncItem>(
      'dedup',
      (item) => item.foreignId,
      (item) => item.key,
    ),
    Stream.take(options.maxMessages),
    Stream.tap(() => Effect.sync(() => options.onTaken(1))),
    Stage.map('process', (item: MailSyncItem) => item.process),
    EmailStage.upsert,
  );

/**
 * The reconcile branch, shared by both providers: resolves each change's foreignId to its feed message's
 * EntityId via `Cursor.State.foreignIndex`, dropping (with a debug log) any whose message was never
 * synced / is outside the window. Produces retag/delete `EmailStage.Change`s that carry no feed object.
 */
export const reconcileToChanges = (
  items: Stream.Stream<ReconcileItem, MailSyncError, Cursor.Service>,
): Stream.Stream<EmailStage.Change, MailSyncError, Cursor.Service> =>
  items.pipe(
    Stage.map('reconcile', (item: ReconcileItem) =>
      Effect.gen(function* () {
        const { foreignIndex } = yield* Cursor.Service;
        const entityId = foreignIndex?.get(item.foreignId);
        if (!entityId) {
          log('mail sync: reconcile change for unsynced message, skipping', { foreignId: item.foreignId });
          return undefined;
        }
        return item._tag === 'delete'
          ? ({ _tag: 'delete', foreignId: item.foreignId, entityId } satisfies EmailStage.Change)
          : ({
              _tag: 'retag',
              foreignId: item.foreignId,
              entityId,
              addTagIds: item.addTagIds,
              removeTagIds: item.removeTagIds,
            } satisfies EmailStage.Change);
      }),
    ),
  );

export type RunMailSyncOptions = {
  readonly binding: Ref.Ref<Cursor.Cursor>;
  /** Candidate messages this run considers before requesting `Operation.runAgain()`. */
  readonly maxMessages?: number;
  /** Reference "now" for window/horizon resolution (pinned by tests); defaults to `new Date()`. */
  readonly now?: Date;
  /** Overrides the dedup-set seed bound (see `Cursor.layer`). Test-only. */
  readonly dedupSeedTail?: number;
};

/**
 * Runs the shared pipeline against the {@link MailSyncProvider} in context. Return type is written out
 * (not inferred) so the emitted `.d.ts` can name it without expanding unnameable types (TS2883).
 */
export const runMailSync = (
  options: RunMailSyncOptions,
): Effect.Effect<
  { newMessages: number },
  MailSyncError | EntityNotFoundError,
  MailSyncProvider | Database.Service | Capability.Service | Operation.Service | Trace.TraceService
> =>
  Effect.gen(function* () {
    const provider = yield* MailSyncProvider;
    const now = options.now ?? new Date();
    const maxMessages = options.maxMessages ?? provider.config.maxItemsPerRun ?? Number.POSITIVE_INFINITY;

    const binding = yield* Database.load(options.binding);
    if (!Cursor.isExternal(binding)) {
      return { newMessages: 0 };
    }
    const mailbox = yield* Database.load(binding.spec.target);
    if (!Mailbox.instanceOf(mailbox)) {
      log.warn('mail sync skipped: binding target is not a Mailbox', {
        provider: provider.name,
        typename: Obj.getTypename(mailbox),
      });
      return { newMessages: 0 };
    }
    const db = Obj.getDatabase(mailbox);
    if (!db) {
      return { newMessages: 0 };
    }

    const targetOptions = readBindingOptions(binding);
    const horizon = Cursor.resolveHorizon({ now, syncBackDays: targetOptions.syncBackDays });
    const maxKey = Cursor.parseKey(binding.max);
    const minKey = Cursor.parseKey(binding.min);
    const windows = Cursor.resolveWindows({ maxKey, minKey, now, horizon });

    const formatWindow = (window: Cursor.Window | undefined) =>
      window && { start: format(window.start, 'yyyy-MM-dd'), end: format(window.end, 'yyyy-MM-dd') };
    log.info('syncing...', {
      provider: provider.name,
      mailbox: Obj.getURI(mailbox),
      maxKey,
      minKey,
      forward: formatWindow(windows.forward),
      backward: formatWindow(windows.backward),
    });

    const feed = yield* Database.load(mailbox.feed);

    // Resolve the child tag index so provider-label tags can be applied synchronously during commit.
    const tagIndex = yield* Database.load(mailbox.tags);

    // Pool already-sent drafts once; `EmailStage.reconcileDrafts` matches incoming messages so a
    // canonical copy's arrival removes its now-redundant draft during commit.
    const draftPool = yield* EmailStage.queryDraftPool(mailbox);

    // The delta-resume token (undefined on the first tick / after staleness): drives the provider's
    // incremental fast-path, and gates building the foreignId→EntityId map (only reconcile runs need it).
    const token = Cursor.readToken(binding);

    // Session/target discovery + the provider's label/folder→tag map; undefined skips the run.
    const source = yield* provider.prepare({ db, binding, mailbox, now, token, maxMessages });
    if (!source) {
      return { newMessages: 0 };
    }

    const stats: Cursor.Stats = { newMessages: 0 };

    // Cooperative cancellation: the progress trace sink wires the meter's cancel control to
    // `ProcessManager.terminate()`; the pipeline also observes this signal for in-process abort.
    const controller = new AbortController();

    // Live sync status via trace `status.update` events. The progress trace sink projects these into
    // the runtime `ProgressRegistry` for `MailboxArticle` and the R0 popover.
    const traceWriter = yield* Trace.TraceService;
    const progressKey = createSyncProgressKey(mailbox);
    const syncLabel = mailbox.name ?? 'Mailbox';
    let progressCurrent = 0;
    let progressTotal: number | undefined;
    type StatusPatch = {
      message?: string;
      current?: number;
      total?: number;
      estimate?: number;
    };
    const reportStatus = (patch: StatusPatch = {}) => {
      if (patch.current !== undefined) {
        progressCurrent = patch.current;
      }
      if (patch.total !== undefined) {
        progressTotal = patch.total;
      }
      traceWriter.write(Trace.StatusUpdate, {
        message: patch.message ?? syncLabel,
        progress: {
          key: progressKey,
          current: patch.current ?? progressCurrent,
          total: patch.total ?? progressTotal,
          estimate: patch.estimate,
        },
      });
    };
    reportStatus({ current: 0 });

    // Accumulate the retrieval total as each page/chunk's ids are enumerated (before any full fetch),
    // so the meter renders a determinate bar. Enumeration runs ahead of the full fetch, so `total`
    // leads `current`.
    let totalToRetrieve = 0;
    const addToTotal = (count: number) => {
      totalToRetrieve += count;
      reportStatus({ total: totalToRetrieve });
    };

    const threads = new Set<string>();
    const senders = new Set<string>();
    const coverage = { plain: 0, synthesizedMarkdown: 0, htmlOnly: 0, none: 0 };

    // Per-run funnel counts, each stage narrower than the last: `taken` (post-dedup candidates — the
    // cap gauge) → `processed` (post-decode/map) → `stats.newMessages` (committed). `extent` is the
    // observed key range, folded into the cursor at run end so a run that commits nothing still advances.
    let taken = 0;
    let processed = 0;
    let attachmentCount = 0;
    const extent: Cursor.Extent = { maxKey: 0, minKey: 0 };
    // Stats PUBLISHING is disabled: it wrote each run's snapshot to the `AppCapabilities.StatsPanel`
    // capability, which isn't available on edge compute. Collection (below, via `collectStats`) is kept.
    // TODO(wittjosiah): Publish stats through the trace feed instead — the way progress is being made
    //   isomorphic across host/edge in #12225 — then re-enable the publish.
    // const statsCompartments = (yield* Capability.getAll(AppCapabilities.StatsPanel)).map((store) =>
    //   store.compartment(meta.profile.key),
    // );
    // const startedAt = new Date().toISOString();
    // const startMs = Date.now();
    // let finishedAt: string | undefined;
    // let finishedMs: number | undefined;
    // const publishStats = () => {
    //   if (statsCompartments.length === 0) {
    //     return;
    //   }
    //   const snapshot = {
    //     startedAt,
    //     ...(finishedAt ? { finishedAt } : {}),
    //     durationMs: (finishedMs ?? Date.now()) - startMs,
    //     range: {
    //       syncBackDays: targetOptions.syncBackDays,
    //       forward: formatWindow(windows.forward),
    //       backward: formatWindow(windows.backward),
    //     },
    //     taken,
    //     processed,
    //     newMessages: stats.newMessages,
    //     threads: threads.size,
    //     senders: senders.size,
    //     coverage,
    //     attachments: attachmentCount,
    //   };
    //   statsCompartments.forEach((compartment) => compartment.set(snapshot));
    // };

    // Pass-through stage: collects per-message telemetry into the run counters. Publishing a live
    // snapshot from these is disabled (see the TODO above) until it goes through the trace feed.
    const collectStats = Stage.map('collect-stats', (change: EmailStage.Change) =>
      Effect.sync(() => {
        // Telemetry counts new messages only; retag/delete changes pass through.
        if (change._tag !== 'upsert') {
          return change;
        }
        const mapped = change;
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
        return mapped;
      }),
    );

    //
    // Start pipeline
    //

    // The cap is applied after dedup (see `MailSyncItem`), so `taken` counts only genuinely-new
    // messages: it tells us whether the run was truncated (→ re-run) or exhausted (→ complete backfill).
    // The provider's `buildSource` internalizes the add-only head (windows → skipCommitted → fetch →
    // dedup → cap → decode) and merges in the reconcile branch, so the harness only pipes the resulting
    // `EmailStage.Change` stream through the shared email tail into the single commit.
    yield* source
      .buildSource({
        windows,
        filter: targetOptions.filter,
        tagIndex,
        maxMessages,
        onEnumerated: addToTotal,
        // Advance at retrieval so `current` reaches `total`; counting after downstream dedup/decode
        // drops would leave the bar short of 100%.
        onRetrieved: () => {
          progressCurrent += 1;
          reportStatus({ current: progressCurrent });
        },
        onTaken: () => {
          taken += 1;
        },
      })
      .pipe(
        EmailStage.processAttachments(),
        // TODO(wittjosiah): Not compatible with edge compute — reaches `Capability.Service`
        //   (`InboxCapabilities.ObjectExtractor`) and invokes `Operation.ExtractMessage`, neither of
        //   which is available off-host. Factor on-arrival extraction into a separate pipeline that runs
        //   where those services exist, rather than inline in the sync.
        // onArrivalExtractors(mailbox),
        EmailStage.extractContacts(),
        EmailStage.reconcileDrafts(draftPool),
        collectStats,
        EmailStage.toCommitUnit({ tagIndex }),
        Stream.grouped(provider.config.commitPageSize),
        Pipeline.run({ sink: Cursor.commit }),
        Effect.provide(
          Cursor.layer({
            cursor: binding,
            feed,
            foreignKeySource: provider.foreignKeySource,
            maxKey,
            minKey,
            trackRange: true,
            stats,
            extent,
            // Resolve EntityIds for only the delta's reconcile messages (not the whole feed). Absent when
            // there's nothing to reconcile this run.
            reconcileFilter:
              source.reconcileForeignIds && source.reconcileForeignIds.length > 0
                ? Filter.foreignKeys(
                    Message.Message,
                    source.reconcileForeignIds.map((id) => ({ source: provider.foreignKeySource, id })),
                  )
                : undefined,
            dedupSeedTail: options.dedupSeedTail,
          }),
        ),
        Pipeline.abortWith(
          controller.signal,
          // TODO(wittjosiah): Could this note+remove pairing be upstreamed into abortWith itself?
          Effect.sync(() => {
            log('mail sync cancelled', { provider: provider.name, mailbox: Obj.getURI(mailbox) });
          }),
        ),
        Effect.tapError((error) =>
          Effect.sync(() => {
            // Log the raw error; the meter shows only a short reason (the full exception — provider
            // errors, auth tokens — must not reach the UI).
            log.warn('mail sync failed', { provider: provider.name, error });
            reportStatus({ message: PROGRESS_STATUS_FAILED });
          }),
        ),
      );

    // Flush indexes once at end of run so cross-run dedup / contact resolution observe this run's writes
    // (per-page commits no longer flush — see `Cursor.commit`).
    yield* Database.flush({ indexes: true });

    // Final stats publish (disabled — see the TODO above) recorded the committed `newMessages` count and
    // the run's end time / duration after the last mid-stream snapshot.
    // finishedMs = Date.now();
    // finishedAt = new Date(finishedMs).toISOString();
    // publishStats();

    // On cancel, only the status event differs; the completed path also has cursor post-run work.
    if (controller.signal.aborted) {
      reportStatus({ message: PROGRESS_STATUS_CANCELLED });
    } else {
      reportStatus({ message: PROGRESS_STATUS_COMPLETE });

      // Fold the run's observed key extent so the window advances even if every scanned message was
      // dedup-dropped (e.g. a crash orphaned feed appends) — prevents an identical re-scan / infinite re-run.
      Cursor.extendRange(binding, extent);

      const capped = taken >= maxMessages;
      // The provider drains the delta in bounded chunks; `hasMoreDelta` means this run consumed one chunk
      // and more remain. Both signals mean "re-run", but only `!capped` advances state.
      const hasMoreDelta = source.hasMoreDelta?.() ?? false;
      log('mail sync run finished', {
        provider: provider.name,
        mailbox: Obj.getURI(mailbox),
        taken,
        maxMessages,
        capped,
        hasMoreDelta,
        newMessages: stats.newMessages,
        action: capped || hasMoreDelta ? 'runAgain' : 'completeBackfill',
      });
      if (!capped) {
        // Additions weren't truncated, so this run's chunk fully drained. Mark backfill done (the backward
        // half reached the horizon) and advance the delta token LAST, only after the merged add+reconcile
        // stream committed. Advancing to the *chunk* boundary bounds each run: a large delta drains over
        // several runs. A crash/cap leaves the token unadvanced → the next run re-fetches the same chunk
        // (additions dedup-drop, tag ops re-apply idempotently).
        Cursor.completeBackfill(binding, horizon.getTime());
        const nextToken = source.nextToken?.();
        if (nextToken !== undefined) {
          Cursor.writeToken(binding, nextToken);
        }
      }
      if (capped || hasMoreDelta) {
        // More to sync — either additions capped, or the delta had more chunks. A durable re-run (rather
        // than an in-process loop) keeps this invocation bounded and lets the runtime schedule the
        // continuation; committed progress + the advanced token/cursor mean the next run resumes forward.
        yield* Operation.runAgain().pipe(Effect.orDie);
      }
    }

    log('sync complete', {
      provider: provider.name,
      newMessages: stats.newMessages,
      cancelled: controller.signal.aborted,
      taken,
    });
    return { newMessages: stats.newMessages };
  });
