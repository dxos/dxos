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
import { Database, Obj, type Ref } from '@dxos/echo';
import { type EntityNotFoundError } from '@dxos/echo/Err';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
import { EmailStage } from '@dxos/pipeline-email';
import { type ContentBlock } from '@dxos/types';

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
  /** Called with each enumeration page/chunk's id count, to accumulate the retrieval total. */
  readonly onEnumerated: (count: number) => void;
  /** Called once per item retrieved (full fetch), to advance progress. */
  readonly onRetrieved: () => void;
};

/**
 * One candidate message: its dedup key fields plus a self-contained `process` effect. The harness
 * dedups on `foreignId`/`key` before running `process`, so dedup stays cheap. `process` fuses the
 * provider's decode + map (API + resolver already provided) into `EmailStage.Mapped`, or `undefined`
 * to drop the item (no body, filtered sender, unmappable).
 */
export type MailSyncItem = {
  readonly foreignId: string;
  readonly key: number;
  readonly process: Effect.Effect<EmailStage.Mapped | undefined, MailSyncError, never>;
};

/** The run's message source, produced by {@link MailSyncProviderService.prepare} once ready. */
export type MailSyncSource = {
  /**
   * Streams candidate messages for one run (forward then backward). Must be UNBOUNDED — the harness
   * caps after dedup — and must pipe raw ids through `Cursor.skipCommitted`. Requires only
   * `Cursor.Service`; the provider's API is already captured.
   */
  readonly buildSource: (options: MailSyncSourceOptions) => Stream.Stream<MailSyncItem, MailSyncError, Cursor.Service>;
};

/** Resolved run context the harness hands a provider's {@link MailSyncProviderService.prepare}. */
export type MailSyncPreparation = {
  readonly db: Database.Database;
  readonly binding: Cursor.ExternalCursor;
  readonly mailbox: Mailbox.Mailbox;
  /** Reference "now" for provider filters with relative dates (pinned by tests). */
  readonly now: Date;
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

    // Session/target discovery + the provider's label/folder→tag map; undefined skips the run.
    const source = yield* provider.prepare({ db, binding, mailbox, now });
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
        return mapped;
      }),
    );

    //
    // Start pipeline
    //

    // The cap is applied after dedup (see `MailSyncItem`), so `taken` counts only genuinely-new
    // messages: it tells us whether the run was truncated (→ re-run) or exhausted (→ complete backfill).
    yield* source
      .buildSource({
        windows,
        filter: targetOptions.filter,
        onEnumerated: addToTotal,
        // Advance at retrieval so `current` reaches `total`; counting after downstream dedup/decode
        // drops would leave the bar short of 100%.
        onRetrieved: () => {
          progressCurrent += 1;
          reportStatus({ current: progressCurrent });
        },
      })
      .pipe(
        Cursor.dedupStage<MailSyncItem>(
          'dedup',
          (item) => item.foreignId,
          (item) => item.key,
        ),
        Stream.take(maxMessages),
        Stream.tap(() => Effect.sync(() => (taken += 1))),
        Stage.map('process', (item: MailSyncItem) => item.process),
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
      log('mail sync run finished', {
        provider: provider.name,
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

    log('sync complete', {
      provider: provider.name,
      newMessages: stats.newMessages,
      cancelled: controller.signal.aborted,
      taken,
    });
    return { newMessages: stats.newMessages };
  });
