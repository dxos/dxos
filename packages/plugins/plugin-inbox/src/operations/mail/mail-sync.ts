//
// Copyright 2026 DXOS.org
//

import { format } from 'date-fns';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Obj, type Ref } from '@dxos/echo';
import { type EntityNotFoundError } from '@dxos/echo/Err';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
import { EmailStage } from '@dxos/pipeline-email';
import { type ContentBlock } from '@dxos/types';

import { MailSyncError } from '../../errors';
import { meta } from '../../meta';
import { Mailbox, type SyncStreamConfig } from '../../types';
import { onArrivalExtractors, readBindingOptions } from '../../util';

/**
 * Provider-agnostic harness for a bidirectional, capped, resumable mail sync (Gmail, JMAP). Every run
 * syncs new mail above the cursor's `max` (ascending) and backfills from `min` down to the horizon
 * (descending), so an interrupted or capped run resumes both halves from where it left off; the cursor
 * is the only durable state (`Cursor.resolveWindows`). The harness owns everything that is not
 * provider-specific — binding/mailbox/feed loads, window resolution, the dedup→cap→process→commit
 * pipeline, the live progress monitor, cooperative cancellation, and stats telemetry.
 *
 * The provider is supplied as an Effect service ({@link MailSyncProvider}) rather than an argument, so
 * the two operations are literally one effect with different services provided: each handler provides
 * a provider layer that captures its own API + resolver (see `syncGmail` / `runJmapSync`). Adding a
 * third provider (Outlook, an IMAP bridge, …) is "write a {@link MailSyncProvider} layer".
 */

/**
 * Progress-registry key for a mailbox's mail-sync monitor — the mailbox URI plus `#sync` so distinct
 * monitor types (e.g. `#topics`) can coexist for one mailbox. `MailboxArticle` subscribes to show the
 * sync meter. Provider-agnostic: a mailbox is bound to one provider, so the keys cannot collide.
 */
export const createSyncProgressKey = (mailbox: Mailbox.Mailbox) => Obj.getURI(mailbox).toString() + '#sync';

/** Options the harness passes to a provider's {@link MailSyncSource.buildSource} for one run. */
export type MailSyncSourceOptions = {
  /**
   * Forward/backward windows this run covers (from `Cursor.resolveWindows`); either may be absent.
   * Direction only sets the walk order over each `[start, end)`: forward oldest→newest (incremental
   * resume), backward newest→oldest (initial/backfill).
   */
  readonly windows: Cursor.Windows;
  /** User search filter from the binding options (provider query DSL). */
  readonly filter?: string;
  /** Called with each enumeration page/chunk's id count, to accumulate the retrieval total. */
  readonly onEnumerated: (count: number) => void;
  /** Called once per item retrieved (full fetch), to advance progress. */
  readonly onRetrieved: () => void;
};

/**
 * One candidate message the provider emits: its dedup key fields plus a self-contained `process`
 * effect. The harness dedups on `foreignId`/`key` *before* running `process`, so those are cheap
 * field reads and never trigger the (potentially expensive) decode/map/attachment work. `process`
 * fuses the provider's decode + map stages into a single per-item effect that is fully provided (the
 * provider layer has already captured its API + resolver), returning the generic `EmailStage.Mapped`
 * the shared stages consume — or `undefined` to drop the item (no body, filtered sender, unmappable).
 */
export type MailSyncItem = {
  readonly foreignId: string;
  readonly key: number;
  readonly process: Effect.Effect<EmailStage.Mapped | undefined, MailSyncError, never>;
};

/** The run's message source, produced by {@link MailSyncProviderService.prepare} once ready. */
export type MailSyncSource = {
  /**
   * Streams candidate messages for one bidirectional run: forward window then backward, concatenated.
   * Must be UNBOUNDED — the harness caps *after* dedup so the budget counts only genuinely-new
   * messages (capping before would let re-enumerated boundary items stall the cursor), and must pipe
   * its raw ids through `Cursor.skipCommitted` so already-committed ids aren't re-downloaded. Requires
   * only `Cursor.Service` (provided by the harness); the provider's own API is already captured.
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
   * Provider-specific setup: resolve the session/target, build the label/folder→tag map, and return
   * the run's source. Returning undefined skips the run (e.g. a session without a mail account) — the
   * harness then returns `{ newMessages: 0 }`. Any provider error is wrapped into {@link MailSyncError}.
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
 * Runs the shared mail-sync pipeline for a binding against the {@link MailSyncProvider} in context.
 * The return type is written out (not inferred) so a caller's emitted `.d.ts` can name it without
 * expanding unnameable cross-package types (TS2883).
 */
export const runMailSync = (
  options: RunMailSyncOptions,
): Effect.Effect<
  { newMessages: number },
  MailSyncError | EntityNotFoundError,
  MailSyncProvider | Database.Service | Capability.Service | Operation.Service
> =>
  Effect.gen(function* () {
    const provider = yield* MailSyncProvider;
    const now = options.now ?? new Date();
    const maxMessages = options.maxMessages ?? provider.config.maxItemsPerRun ?? Number.POSITIVE_INFINITY;

    const binding = yield* Database.load(options.binding);
    // The integration mechanism only ever creates external-sync cursors for mail providers.
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
    // `max`/`min` are the newest/oldest committed provider key (epoch-ms) — see `Cursor.resolveWindows`.
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

    // Accumulate the retrieval total as each page/chunk's ids are enumerated (before any full fetch),
    // so the meter renders a determinate bar. Enumeration runs ahead of the full fetch, so `total`
    // leads `current`.
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
    // `buildSource` covers both halves as one unbounded stream; the per-run cap is applied after dedup
    // so it counts only genuinely-new messages — capping before would let a dense boundary's
    // re-enumerated messages consume the budget and stall the cursor. `taken` then tells us whether the
    // cap truncated the run (→ re-run) or both windows were exhausted (→ complete backfill). Each
    // provider fuses its decode + map into `item.process`, run here as the single `process` stage.
    yield* source
      .buildSource({
        windows,
        filter: targetOptions.filter,
        onEnumerated: addToTotal,
        // Advance at retrieval so `current` reaches `total`; counting after downstream dedup/decode
        // drops would leave the bar short of 100%.
        onRetrieved: () => progressMonitor.advance(1),
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
        onArrivalExtractors(mailbox),
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
            progressMonitor.note('Cancelled');
            progressMonitor.remove();
          }),
        ),
        Effect.tapError((error) =>
          Effect.sync(() => {
            // Log the raw error; the meter shows only a short reason (the full exception — provider
            // errors, auth tokens — must not reach the UI).
            log.warn('mail sync failed', { provider: provider.name, error });
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
    // The run span is added by each provider wrapper (`gmail-sync` / `jmap-sync`) so the per-provider
    // trace name and its children (`<provider>-sync.labels`, `.fetch.*`) stay stable.
  });
