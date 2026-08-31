//
// Copyright 2026 DXOS.org
//

import { format } from 'date-fns';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import * as Capability from '@dxos/app-framework/Capability';
import { PROGRESS_STATUS_CANCELLED, PROGRESS_STATUS_COMPLETE, PROGRESS_STATUS_FAILED } from '@dxos/app-toolkit';
import * as Cancellation from '@dxos/compute/Cancellation';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Filter, Obj, Query, type Ref } from '@dxos/echo';
import { type EntityNotFoundError } from '@dxos/echo/Error';
import { Cursor } from '@dxos/link';
import { log } from '@dxos/log';
import { Pipeline, Stage } from '@dxos/pipeline';
import { EmailStage } from '@dxos/pipeline-email';
import { type TagIndex } from '@dxos/schema';
import { type ContentBlock, Message } from '@dxos/types';

import { Mailbox, SyncStreamConfig } from '#types';

import { MailSyncError } from '../errors';
import { readBindingOptions } from './binding';
import { diffTags } from './tag-diff';
import { type TagPushOp, createRemoteObserver, remoteFromBase, resolvePushOps, tagsFromIndex } from './tag-push';

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
// Absolute form, matching the other pipeline keys: the producer (this module, running in an
// operation) and the consumer (`MailboxArticle`) derive the key independently, so a hydration-
// dependent URI form would silently hide the meter. See `InboxOperation.createProgressKey`.
export const createSyncProgressKey = (mailbox: Mailbox.Mailbox) =>
  Obj.getURI(mailbox, { prefer: 'absolute' }).toString() + '#sync';

/** Options the harness passes to a provider's {@link MailSyncSource.buildSource} for one run. */
export type MailSyncSourceOptions = {
  /** Forward/backward windows this run covers (`Cursor.resolveWindows`); either may be absent. */
  readonly windows: Cursor.Windows;
  /** User search filter from the binding options (provider query DSL). */
  readonly filter?: string;
  /** The mailbox's tag index — a provider's reconcile branch reads it to diff remote vs local tags. */
  readonly tagIndex: TagIndex.TagIndex;
  /** Called with each enumeration page/chunk's id count, to accumulate the retrieval total. */
  readonly onEnumerated: (count: number) => void;
  /** Called once per item retrieved (full fetch), to advance progress. */
  readonly onRetrieved: () => void;
};

/**
 * One candidate message: dedup key fields plus a self-contained `process` effect that decodes it into an
 * `insert` `EmailStage.Change` (or `undefined` to drop it). The harness dedups and caps before
 * `process`, so decode runs only for survivors.
 */
export type MailSyncItem = {
  readonly foreignId: string;
  readonly key: number;
  readonly process: Effect.Effect<EmailStage.Change | undefined, MailSyncError, never>;
};

/**
 * A `retag`/`delete` {@link EmailStage.Change} minus its `entityId` — the shape a provider produces
 * before {@link reconcileToChanges} resolves `foreignId` → `entityId`.
 */
export type ReconcileItem = Omit<EmailStage.Retag, 'entityId'> | Omit<EmailStage.Delete, 'entityId'>;

/** The run's two raw source streams, produced by {@link MailSyncProviderService.prepare} once ready. */
export type MailSyncStreams = {
  /**
   * Raw new-message candidates (the provider's windows → `skipCommitted` → fetch). Not yet deduped,
   * capped, or decoded — the harness applies `dedupStage` → `boundStage` → decode, so those generic
   * stages stay visible in its pipeline rather than hidden in the provider.
   */
  readonly additions: Stream.Stream<MailSyncItem, MailSyncError, Cursor.Service>;
  /**
   * Fully-resolved reconcile changes (retag/delete). Provider-coupled: the resolution is either the
   * shared {@link reconcileToChanges} (Gmail) or a provider-specific re-fetch+diff (JMAP), so unlike
   * additions this arrives as `Change`. The harness merges it with the decoded additions.
   */
  readonly reconciles: Stream.Stream<EmailStage.Change, MailSyncError, Cursor.Service>;
};

/** The run's change source, produced by {@link MailSyncProviderService.prepare} once ready. */
export type MailSyncSource = {
  /**
   * Builds the run's two raw streams. The provider owns only what's provider-specific — the
   * forward/backward windows, `skipCommitted`, fetch, and (for `reconciles`) the resolution — while the
   * harness owns the generic head (dedup/cap/decode), the merge, and the shared email tail, so the full
   * stage list is flat and visible there. Requires only `Cursor.Service`; the provider's API is captured.
   */
  readonly buildSource: (options: MailSyncSourceOptions) => MailSyncStreams;
  /**
   * The opaque delta-resume token at this run's chunk boundary (first-tick / staleness paths return the
   * freshly-captured provider token). The harness reads it at run end and writes it to the cursor only
   * after the stream fully drains. Advancing to a *chunk* boundary (not the whole delta) bounds each run:
   * a large delta drains across runs. Absent for providers with no delta path.
   */
  readonly nextToken?: () => string | undefined;
  /**
   * Whether the provider has more delta beyond the chunk fetched this run. When true the harness requests
   * a durable `runAgain()` so reconciliation is bounded per run and resumed from the advanced token —
   * the same budget/re-run treatment additions already get.
   */
  readonly hasMoreDelta?: () => boolean;
  /**
   * The already-committed feed foreign ids this run's reconcile branch targets (JMAP `updated`, Gmail
   * label-change message ids). The harness resolves *only* these to EntityIds (see
   * `Cursor.LayerOptions.reconcileFilter`) rather than scanning the whole feed.
   */
  readonly reconcileForeignIds?: readonly string[];
  /**
   * Tag uri → provider label id for every tag this provider can write — its label map inverted. Its
   * keys are the eligible set for tag reconciliation, so a tag absent here is invisible to the push
   * (which is what keeps user tags from being pushed as new provider labels).
   *
   * Absent, or empty, disables the tag-push phase for the run.
   */
  readonly tagBindings?: ReadonlyMap<string, string>;
};

/**
 * Per-op outcome of a tag push. The split exists because "the push drained" and "every op succeeded"
 * are different questions, and only the first may advance the reconciliation base.
 */
export type TagPushResult = {
  /**
   * Ops that reached a terminal state — applied, or permanently rejected (message deleted, label
   * gone, insufficient scope). Safe to advance past: no retry can change a permanent rejection, and
   * refusing to advance would block the base forever.
   */
  readonly settled: readonly TagPushOp[];
  /** Ops that failed transiently (429, 5xx, timeout) and must be retried on a later run. */
  readonly pending: readonly TagPushOp[];
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
  readonly config: SyncStreamConfig.SyncStreamConfig;
  /** Foreign-key source stamped on committed items (dedup key namespace). */
  readonly foreignKeySource: string;
  /**
   * Resolve the session/target and tag map, returning the run's source; `undefined` skips the run
   * (e.g. no mail account). Provider errors are wrapped into {@link MailSyncError}.
   */
  readonly prepare: (
    preparation: MailSyncPreparation,
  ) => Effect.Effect<MailSyncSource | undefined, MailSyncError, never>;
  /**
   * Applies local tag changes at the provider. Absent for a provider with no write path, which
   * degrades the run to pull-only rather than failing it.
   *
   * Reports per-op outcomes rather than succeeding or failing as a whole: the harness decides what
   * each outcome means for the reconciliation base, and only a run with nothing `pending` may advance
   * it. Retry is between runs — never a loop inside this call, which owns no backoff state.
   */
  readonly pushTags?: (ops: readonly TagPushOp[]) => Effect.Effect<TagPushResult, MailSyncError, never>;
}

/**
 * Effect service carrying the provider a mail-sync run drives. A handler provides a layer whose
 * implementation captures the provider's API + resolver, so the shared harness never names them.
 */
export class MailSyncProvider extends Context.Service<MailSyncProvider, MailSyncProviderService>()(
  '@dxos/plugin-inbox/MailSyncProvider',
) {}

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
          ? ({
              _tag: 'delete',
              foreignId: item.foreignId,
              entityId,
            } satisfies EmailStage.Change)
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

/** What the tag-push phase reports back to the run's state-persistence decision. */
type TagPushOutcome = {
  /** Heads to persist as the next base, or undefined when the phase did not run. */
  readonly nextHeads: readonly string[] | undefined;
  /** Ops that must be retried on a later run; non-empty blocks the base from advancing. */
  readonly pending: readonly TagPushOp[];
};

const NO_TAG_PUSH: TagPushOutcome = { nextHeads: undefined, pending: [] };

/**
 * Resolves message ids to provider foreign ids for messages the run did not already touch — a user
 * starring a message synced weeks ago. Bounded by the push diff, not the feed.
 */
const resolveForeignIds = Effect.fn('mail-sync.resolveForeignIds')(function* (
  feed: Feed.Feed,
  foreignKeySource: string,
  messageIds: readonly string[],
) {
  const resolved = new Map<string, string>();
  if (messageIds.length === 0) {
    return resolved;
  }
  const messages = yield* Feed.query(feed, Query.select(Filter.id(...messageIds))).run;
  for (const message of messages) {
    for (const key of Obj.getMeta(message).keys) {
      if (key.source === foreignKeySource) {
        resolved.set(message.id, key.id);
      }
    }
  }
  return resolved;
});

/**
 * The local → provider half of tag sync: diff the tag index against the base recorded at the last
 * completed run, and apply what changed locally at the provider.
 *
 * Returns the heads to persist as the next base and any ops that must be retried. Never fails the
 * run — a provider with no write path, no bindings, or an unreadable base degrades to pull-only.
 */
const pushLocalTags = Effect.fn('mail-sync.pushTags')(function* ({
  provider,
  source,
  binding,
  feed,
  tagIndex,
  observed,
}: {
  provider: MailSyncProviderService;
  source: MailSyncSource;
  binding: Cursor.ExternalCursor;
  feed: Feed.Feed;
  tagIndex: TagIndex.TagIndex;
  observed: ReturnType<typeof createRemoteObserver>;
}) {
  const bindings = source.tagBindings;
  if (!provider.pushTags || !bindings || bindings.size === 0) {
    return NO_TAG_PUSH;
  }

  const eligible = new Set(bindings.keys());
  const savedHeads = Cursor.readTagHeads(binding);
  // Captured here, between the pull's commit and the push — see the ordering rule in TAG-SYNC.md.
  const nextHeads = Obj.version(tagIndex).automergeHeads;
  const local = tagsFromIndex(tagIndex.index ?? {}, eligible);

  // A base is absent for three different reasons, and only one of them justifies pushing nothing.
  //
  // A genuinely NEW binding (no heads, no watermark) has no evidence its local tags were ever meant
  // for the provider, so it records a base and pushes nothing. But a binding that has been syncing
  // for weeks and is only now gaining tag sync ALSO has no heads — and treating that as a first sync
  // strands every tag the user already applied: the first run absorbs them into the base, after which
  // `local ⊖ base` is empty forever and they can never reach the provider. Diagnosed live against a
  // real mailbox whose four existing stars had become permanently unpushable exactly this way.
  //
  // So an existing binding gaining tag sync takes the additive path instead — push what the remote
  // lacks, remove nothing — which is the same treatment as heads that no longer resolve.
  let base: ReturnType<typeof tagsFromIndex> | undefined;
  const newBinding = Cursor.parseKey(binding.max) === 0 && Cursor.readToken(binding) === undefined;
  let firstSync = savedHeads === undefined && newBinding;
  if (savedHeads !== undefined) {
    try {
      const historical = Obj.getVersion(tagIndex, savedHeads);
      base = tagsFromIndex(historical.index ?? {}, eligible);
    } catch (error) {
      // The replica no longer holds the change those heads name (compaction, epoch, a fresh load on
      // another runtime). Fall back to the additive reconcile rather than re-baselining silently.
      log.warn('mail sync: tag base heads did not resolve, falling back to additive reconcile', {
        provider: provider.name,
        error,
      });
      firstSync = false;
    }
  }

  const remote = remoteFromBase(base, observed, eligible);
  const diff = diffTags({ base, local, remote, eligible, firstSync });
  if (diff.push.size === 0) {
    log('mail sync: no local tag changes to push', { provider: provider.name, firstSync, based: base !== undefined });
    return { nextHeads, pending: [] };
  }

  // Most ids were captured in flight; only messages untouched by this run need a lookup.
  const missing = [...diff.push.keys()].filter((id) => !observed.foreignIds.has(id));
  const looked = yield* resolveForeignIds(feed, provider.foreignKeySource, missing);
  const foreignIds = new Map([...observed.foreignIds, ...looked]);

  const ops = resolvePushOps({ push: diff.push, foreignIds, bindings });
  if (ops.length === 0) {
    log('mail sync: tag changes resolved to no pushable ops', { provider: provider.name, changed: diff.push.size });
    return { nextHeads, pending: [] };
  }

  log.info('mail sync: pushing local tag changes', { provider: provider.name, ops: ops.length });
  const result = yield* provider.pushTags(ops).pipe(
    Effect.catch((error) => {
      // A fault that aborted the whole push (auth revoked, network down): every op is unsettled, so
      // the base must not advance.
      log.warn('mail sync: tag push failed', { provider: provider.name, error });
      return Effect.succeed({ settled: [], pending: ops } satisfies TagPushResult);
    }),
  );
  log.info('mail sync: tag push complete', {
    provider: provider.name,
    settled: result.settled.length,
    pending: result.pending.length,
  });
  return { nextHeads, pending: result.pending };
});

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

    log.info('mail sync starting', {
      provider: provider.name,
      binding: options.binding.uri,
      maxMessages,
      now: now.toISOString(),
    });

    const binding = yield* Database.load(options.binding);
    if (!Cursor.isExternal(binding)) {
      log.info('mail sync skipped: binding is not external', {
        provider: provider.name,
        typename: Obj.getTypename(binding),
        kind: binding.spec?.kind,
      });
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
      log.warn('mail sync skipped: no database');
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
      horizon: horizon.toISOString(),
      syncBackDays: targetOptions.syncBackDays,
      filter: targetOptions.filter,
      maxMessages,
      forward: formatWindow(windows.forward),
      backward: formatWindow(windows.backward),
    });

    // A run with neither window resolves to no enumeration at all: the cursor already spans the full
    // horizon (nothing older to backfill) and there is nothing newer than `maxKey`. On edge this is the
    // most common cause of a `{ newMessages: 0 }` despite mail existing — surface it explicitly.
    if (!windows.forward && !windows.backward) {
      log.warn('mail sync: no windows to scan — cursor already covers the full range', {
        provider: provider.name,
        mailbox: Obj.getURI(mailbox),
        maxKey,
        minKey,
        horizon: horizon.toISOString(),
      });
    }

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
      log.warn('mail sync skipped: no source', { provider: provider.name, mailbox: Obj.getURI(mailbox) });
      return { newMessages: 0 };
    }
    log.info('mail sync source prepared', { provider: provider.name, mailbox: Obj.getURI(mailbox) });

    const stats: Cursor.Stats = { newMessages: 0 };

    // Fires on run cancellation (local terminate or EDGE cancel) — the pipeline observes it below.
    const signal = yield* Cancellation.signal;

    // Live sync status via trace `status.update` events. The progress trace sink projects these into
    // the runtime `ProgressRegistry` for `MailboxArticle` and the R0 popover.
    const traceWriter = yield* Trace.TraceService;
    const progressKey = createSyncProgressKey(mailbox);
    // The phase leads, so the meter says what is happening before it says what to: sync and analyze
    // run against the same mailbox and both meters read `message`, and a name-first label truncated
    // away the only part that told them apart.
    const syncLabel = `Syncing ${mailbox.name ?? 'mailbox'}`;
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
      log('mail sync enumerated page', { provider: provider.name, page: count, totalToRetrieve });
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
    // Records the provider's reported tag state as changes stream past — the delta is consumed by the
    // pipeline, so it cannot be asked for after the fact. See `tag-push.ts`.
    const remoteObserver = createRemoteObserver();
    const observeTags = Stage.map('observe-tags', (change: EmailStage.Change) =>
      Effect.sync(() => {
        remoteObserver.observe(change);
        return change;
      }),
    );

    const collectStats = Stage.map('collect-stats', (change: EmailStage.Change) =>
      Effect.sync(() => {
        // Telemetry counts new messages only; retag/delete changes pass through.
        if (change._tag !== 'insert') {
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

    // The provider yields two raw streams; the harness owns everything generic. The add-only head —
    // dedup on foreignId/key, then cap at `maxMessages` (counting survivors into `taken`, which tells a
    // truncated run → re-run from an exhausted one → complete backfill), then the provider decode into an
    // `insert` Change — is flat here rather than hidden in the provider.
    const { additions, reconciles } = source.buildSource({
      windows,
      filter: targetOptions.filter,
      tagIndex,
      onEnumerated: addToTotal,
      // Advance at retrieval so `current` reaches `total`; counting after downstream dedup/decode
      // drops would leave the bar short of 100%.
      onRetrieved: () => {
        progressCurrent += 1;
        reportStatus({ current: progressCurrent });
      },
    });
    const inserts = additions.pipe(
      Cursor.dedupStage<MailSyncItem>(
        'dedup',
        (item) => item.foreignId,
        (item) => item.key,
      ),
      Cursor.boundStage<MailSyncItem>(maxMessages, () => {
        taken += 1;
      }),
      Stage.map('decode', (item: MailSyncItem) => item.process),
    );

    // Additions and reconciles converge into the shared email tail → single commit. `dedup`/`bound`/
    // `decode` are add-only (a retag targets an already-committed message), so they run before the merge.
    yield* Stream.merge(inserts, reconciles).pipe(
      EmailStage.processAttachments(),
      // TODO(wittjosiah): Not compatible with edge compute — reaches `Capability.Service`
      //   (`InboxCapabilities.ObjectExtractor`) and invokes `Operation.ExtractMessage`, neither of
      //   which is available off-host. Factor on-arrival extraction into a separate pipeline that runs
      //   where those services exist, rather than inline in the sync.
      // onArrivalExtractors(mailbox),
      EmailStage.extractContacts(),
      EmailStage.reconcileDrafts(draftPool),
      observeTags,
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
        signal,
        // `abortWith` interrupts, so nothing below the pipeline runs — the terminal status must be
        // emitted here or the meter's key stays suppressed for every later run.
        Effect.sync(() => {
          log('mail sync cancelled', { provider: provider.name, mailbox: Obj.getURI(mailbox) });
          reportStatus({ message: PROGRESS_STATUS_CANCELLED });
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

    // Local → provider tag reconciliation. Runs AFTER the pull has committed and BEFORE the sync state
    // is persisted: the heads captured here already contain this run's pulled tags (so they are not
    // re-pushed next run) while anything the user does after this instant belongs to the next run (so
    // it is not silently absorbed). See `docs/TAG-SYNC.md` §"Ordering within a run".
    //
    // Defects are contained here rather than allowed to fail the run. This phase sits OUTSIDE the
    // pipeline's `tapError`, so an escaping failure would end the run with no terminal status at all —
    // leaving the progress key live and the mailbox's Sync button disabled until the user navigates
    // away. The pull has already committed by this point, so losing the push is a degradation; losing
    // the run's completion signal is a visible break.
    const tagPush = yield* pushLocalTags({
      provider,
      source,
      binding,
      feed,
      tagIndex,
      observed: remoteObserver,
    }).pipe(
      Effect.catchCause((cause) =>
        Effect.sync(() => {
          log.warn('mail sync: tag push phase failed, continuing pull-only', { provider: provider.name, cause });
          return NO_TAG_PUSH;
        }),
      ),
    );

    // Full funnel, each stage narrower than the last, so a zero result on a completed run can be
    // attributed: `enumerated` 0 → empty windows / provider returned no ids; `taken` 0
    // with `enumerated` > 0 → everything dedup-dropped (cursor already has these); `processed` 0 with
    // `taken` > 0 → every candidate dropped in decode/map (no body, filtered sender, unmappable);
    // `newMessages` 0 with `processed` > 0 → commit dropped them (e.g. draft reconciliation).
    log.info('mail sync funnel', {
      provider: provider.name,
      mailbox: Obj.getURI(mailbox),
      enumerated: totalToRetrieve,
      retrieved: progressCurrent,
      taken,
      processed,
      newMessages: stats.newMessages,
      maxMessages,
      coverage,
      threads: threads.size,
      senders: senders.size,
      attachments: attachmentCount,
      extent,
    });

    // Final stats publish (disabled — see the TODO above) recorded the committed `newMessages` count and
    // the run's end time / duration after the last mid-stream snapshot.
    // finishedMs = Date.now();
    // finishedAt = new Date(finishedMs).toISOString();
    // publishStats();

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
    if (!capped && tagPush.pending.length === 0) {
      // Additions weren't truncated and every tag op settled, so this run's chunk fully drained: mark
      // backfill done (the backward half reached the horizon) and advance the sync state LAST, only
      // after the merged stream committed and the push returned. A crash/cap leaves it unadvanced, so
      // the next run re-fetches the same chunk (additions dedup-drop, tag ops re-apply idempotently).
      //
      // The token and the tag heads go in ONE `Obj.update`. They describe the same position, and
      // advancing the token without the heads leaves the next run diffing a fresh delta against a
      // stale base — see `Cursor.writeSyncState`.
      Cursor.completeBackfill(binding, horizon.getTime());
      const nextToken = source.nextToken?.();
      if (nextToken !== undefined || tagPush.nextHeads !== undefined) {
        Cursor.writeSyncState(binding, { token: nextToken, tagHeads: tagPush.nextHeads });
      }
    }
    if (capped || hasMoreDelta || tagPush.pending.length > 0) {
      // More to sync — either additions capped, or the delta had more chunks. A durable re-run (rather
      // than an in-process loop) keeps this invocation bounded and lets the runtime schedule the
      // continuation; committed progress + the advanced token/cursor mean the next run resumes forward.
      return yield* Operation.runAgain().pipe(Effect.orDie);
    }

    log('sync complete', {
      provider: provider.name,
      newMessages: stats.newMessages,
      taken,
    });
    return { newMessages: stats.newMessages };
  });
