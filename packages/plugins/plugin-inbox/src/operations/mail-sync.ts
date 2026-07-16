//
// Copyright 2026 DXOS.org
//

import { format } from 'date-fns';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Database, Obj, type Ref } from '@dxos/echo';
import { type EntityNotFoundError } from '@dxos/echo/Err';
import { type Resolver } from '@dxos/extractor';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
import { EmailStage } from '@dxos/pipeline-email';
import { type ContentBlock } from '@dxos/types';

import { meta } from '../meta';
import { Mailbox, type SyncStreamConfig } from '../types';
import { onArrivalExtractors, readBindingOptions } from '../util';

/**
 * Provider-agnostic harness for a bidirectional, capped, resumable mail sync (Gmail, JMAP). Every run
 * syncs new mail above the cursor's `max` (ascending) and backfills from `min` down to the horizon
 * (descending), so an interrupted or capped run resumes both halves from where it left off; the cursor
 * is the only durable state (`Cursor.resolveWindows`). The harness owns everything that is not
 * provider-specific — binding/mailbox/feed loads, window resolution, the dedup→cap→decode→map→commit
 * pipeline, the live progress monitor, cooperative cancellation, and stats telemetry — while the
 * provider adapters (`syncGmail`, `runJmapSync`) supply the source stream and mapping stages via
 * {@link MailSyncHooks}.
 */

/**
 * Progress-registry key for a mailbox's mail-sync monitor — the mailbox URI plus `#sync` so distinct
 * monitor types (e.g. `#topics`) can coexist for one mailbox. `MailboxArticle` subscribes to show the
 * sync meter. Provider-agnostic: a mailbox is bound to one provider, so the keys cannot collide.
 */
export const createSyncProgressKey = (mailbox: Mailbox.Mailbox) => Obj.getURI(mailbox).toString() + '#sync';

/** Options the harness passes to {@link MailSyncProvider.buildSource} for one run. */
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
 * The provider-specific pieces of one sync run, produced by {@link MailSyncHooks.prepare} once the
 * session/target and tag map are resolved. Generic over the provider's raw item type (`Raw`), its
 * decoded form (`Decoded`), and its error/service channel.
 */
export type MailSyncProvider<Raw, Decoded, ProviderError, ProviderApi> = {
  /**
   * Streams raw provider items for one bidirectional run: forward window then backward, concatenated.
   * Must be UNBOUNDED — the harness caps *after* dedup so the budget counts only genuinely-new
   * messages (capping before would let re-enumerated boundary items stall the cursor), and must pipe
   * through `Cursor.skipCommitted` so already-committed ids aren't re-downloaded.
   */
  readonly buildSource: (
    options: MailSyncSourceOptions,
  ) => Stream.Stream<Raw, ProviderError, ProviderApi | Cursor.Service>;
  /** Provider foreign id (the dedup key; matches `Obj.Meta.keys[].id`). */
  readonly getForeignId: (raw: Raw) => string;
  /** Monotonic provider key (epoch-ms) used to advance the cursor. */
  readonly getKey: (raw: Raw) => number;
  /** Decodes the raw item's body; drops items with no body (undefined removes the item). */
  readonly decodeBodyStage: Stage.Stage<Raw, Decoded, never, never>;
  /** Resolves the sender contact, builds the ECHO message, and maps provider labels/folders to tag URIs. */
  readonly mapToMessageStage: Stage.Stage<Decoded, EmailStage.Mapped, never, Resolver | ProviderApi>;
};

/** Everything a provider adapter supplies to {@link runMailSync}. */
export type MailSyncHooks<Raw, Decoded, ProviderError, ProviderApi> = {
  /** Provider tag for spans and logs (`gmail`, `jmap`); the run's span is `<name>-sync`. */
  readonly name: string;
  /** The provider's streaming-pipeline tuning (commit page size etc.). */
  readonly config: SyncStreamConfig;
  /** Foreign-key source stamped on committed items (dedup key namespace). */
  readonly foreignKeySource: string;
  readonly binding: Ref.Ref<Cursor.Cursor>;
  /** Candidate messages this run considers before requesting `Operation.runAgain()`. */
  readonly maxMessages: number;
  /** Reference "now" for window/horizon resolution (pinned by tests). */
  readonly now: Date;
  /** Overrides the dedup-set seed bound (see `Cursor.layer`). Test-only. */
  readonly dedupSeedTail?: number;
  /**
   * Provider-specific setup: resolve the session/target, build the label/folder→tag map, and return
   * the run's source + stages. Returning undefined skips the run (e.g. a session without a mail
   * account) — the harness then returns `{ newMessages: 0 }`.
   */
  readonly prepare: (context: {
    db: Database.Database;
    binding: Cursor.ExternalCursor;
    mailbox: Mailbox.Mailbox;
    now: Date;
  }) => Effect.Effect<
    MailSyncProvider<Raw, Decoded, ProviderError, ProviderApi> | undefined,
    ProviderError,
    ProviderApi | Database.Service
  >;
};

/**
 * Runs the shared mail-sync pipeline for a binding against the provider described by `hooks`. The
 * return type is written out (not inferred) so a caller's emitted `.d.ts` can name it without
 * expanding unnameable cross-package types (TS2883).
 */
export const runMailSync = <Raw, Decoded, ProviderError, ProviderApi>(
  hooks: MailSyncHooks<Raw, Decoded, ProviderError, ProviderApi>,
): Effect.Effect<
  { newMessages: number },
  ProviderError | EntityNotFoundError,
  ProviderApi | Database.Service | Resolver | Capability.Service | Operation.Service
> =>
  Effect.gen(function* () {
    const binding = yield* Database.load(hooks.binding);
    // The integration mechanism only ever creates external-sync cursors for mail providers.
    if (!Cursor.isExternal(binding)) {
      return { newMessages: 0 };
    }
    const mailbox = yield* Database.load(binding.spec.target);
    if (!Mailbox.instanceOf(mailbox)) {
      log.warn('mail sync skipped: binding target is not a Mailbox', {
        provider: hooks.name,
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
    const horizon = Cursor.resolveHorizon({ now: hooks.now, syncBackDays: targetOptions.syncBackDays });
    const maxKey = Cursor.parseKey(binding.max);
    const minKey = Cursor.parseKey(binding.min);
    const windows = Cursor.resolveWindows({ maxKey, minKey, now: hooks.now, horizon });

    const formatWindow = (window: Cursor.Window | undefined) =>
      window && { start: format(window.start, 'yyyy-MM-dd'), end: format(window.end, 'yyyy-MM-dd') };
    log.info('syncing...', {
      provider: hooks.name,
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
    const provider = yield* hooks.prepare({ db, binding, mailbox, now: hooks.now });
    if (!provider) {
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
    // cap truncated the run (→ re-run) or both windows were exhausted (→ complete backfill).
    yield* provider
      .buildSource({
        windows,
        filter: targetOptions.filter,
        onEnumerated: addToTotal,
        // Advance at retrieval so `current` reaches `total`; counting after downstream dedup/decode
        // drops would leave the bar short of 100%.
        onRetrieved: () => progressMonitor.advance(1),
      })
      .pipe(
        Cursor.dedupStage<Raw>('dedup', provider.getForeignId, provider.getKey),
        Stream.take(hooks.maxMessages),
        Stream.tap(() => Effect.sync(() => (taken += 1))),
        provider.decodeBodyStage,
        provider.mapToMessageStage,
        EmailStage.processAttachments(),
        onArrivalExtractors(mailbox),
        EmailStage.extractContacts(),
        EmailStage.reconcileDrafts(draftPool),
        collectStats,
        EmailStage.toCommitUnit({ tagIndex }),
        Stream.grouped(hooks.config.commitPageSize),
        Pipeline.run({ sink: Cursor.commit }),
        Effect.provide(
          Cursor.layer({
            cursor: binding,
            feed,
            foreignKeySource: hooks.foreignKeySource,
            maxKey,
            minKey,
            trackRange: true,
            stats,
            extent,
            dedupSeedTail: hooks.dedupSeedTail,
          }),
        ),
        Pipeline.abortWith(
          controller.signal,
          // TODO(wittjosiah): Could this note+remove pairing be upstreamed into abortWith itself?
          Effect.sync(() => {
            log('mail sync cancelled', { provider: hooks.name, mailbox: Obj.getURI(mailbox) });
            progressMonitor.note('Cancelled');
            progressMonitor.remove();
          }),
        ),
        Effect.tapError((error) =>
          Effect.sync(() => {
            // Log the raw error; the meter shows only a short reason (the full exception — provider
            // errors, auth tokens — must not reach the UI).
            log.warn('mail sync failed', { provider: hooks.name, error });
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

      const capped = taken >= hooks.maxMessages;
      log('mail sync run finished', {
        provider: hooks.name,
        mailbox: Obj.getURI(mailbox),
        taken,
        maxMessages: hooks.maxMessages,
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
      provider: hooks.name,
      newMessages: stats.newMessages,
      cancelled: controller.signal.aborted,
      taken,
    });
    return { newMessages: stats.newMessages };
  }).pipe(Effect.withSpan(`${hooks.name}-sync`));
