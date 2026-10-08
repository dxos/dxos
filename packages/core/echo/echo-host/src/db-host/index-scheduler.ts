//
// Copyright 2026 DXOS.org
//

import { DeferredTask, type ReadOnlyEvent, scheduleTask } from '@dxos/async';
import { type Context, Resource } from '@dxos/context';
import { FeedProtocol } from '@dxos/protocols';

/**
 * Longest a trace append waits for the background pass that indexes it. An agent turn appends trace
 * messages continuously, and starting a pass per append kept the worker saturated for the whole turn;
 * a reader that needs them sooner (a feed-scoped query, `flush`) drives the pass itself.
 */
export const TRACE_INDEX_DELAY_MS = 1_000;

/**
 * Every path that can start an indexing run. Logged on each run so an idle-churn loop is
 * attributable from `app.log` alone — the counts are otherwise indistinguishable between a
 * data-driven pass and a self-sustaining invalidation cycle.
 */
export type IndexRunReason =
  | 'open'
  | 'feed-blocks'
  | 'trace-blocks'
  | 'documents-saved'
  | 'batch-continuation'
  | 'rpc-update-indexes'
  | 'feed-scoped-query'
  | 'epoch';

/** Requests that drive the indexer directly, as opposed to the events that schedule it. */
export type IndexRequestReason = Extract<IndexRunReason, 'rpc-update-indexes' | 'feed-scoped-query' | 'epoch'>;

/** What the scheduler needs to know about a finished pass; `undefined` means the host is closing. */
export type IndexPassResult = {
  /** The pass found nothing more to index. */
  done: boolean;
  /** Every input that existed when the pass started is indexed. */
  drained: boolean;
};

export type IndexSchedulerProps = {
  /** `FeedStore.onNewBlocks`. */
  feedBlocks: ReadOnlyEvent<{ spaceId: string; feedNamespace?: string }>;
  /** `AutomergeHost.documentsSaved`. */
  documentsSaved: ReadOnlyEvent;
  /** Runs one pass over every data source, given the reasons that accumulated since the last one. */
  runPass: (ctx: Context, reasons: Record<string, number>) => Promise<IndexPassResult | undefined>;
};

/**
 * Decides when the index runs: subscribes to the writes that need indexing, coalesces them into
 * passes, and lets callers wait for the inputs that existed when they asked.
 */
export class IndexScheduler extends Resource {
  readonly #feedBlocks: IndexSchedulerProps['feedBlocks'];
  readonly #documentsSaved: IndexSchedulerProps['documentsSaved'];
  readonly #runPass: IndexSchedulerProps['runPass'];

  #task: DeferredTask | undefined;

  /**
   * Why the pending run was scheduled, counted per reason. `DeferredTask` coalesces overlapping
   * `schedule()` calls into one run, so attributing a run needs the full multiset of reasons that
   * accumulated before it started — a single "last caller" field would misattribute every coalesced run.
   */
  readonly #pendingReasons = new Map<IndexRunReason, number>();

  /**
   * Bumped by every change that needs indexing (not by a pass continuing its own backlog), so a
   * caller can wait for the inputs that existed when it asked rather than for the index to go idle.
   */
  #inputGeneration = 0;

  /** The newest input generation a drained pass has fully indexed. */
  #indexedGeneration = 0;

  /** Whether the last pass found nothing to index. */
  #lastPassIdle = false;

  /** Whether a throttled trace-triggered run is already waiting to start. */
  #traceRunPending = false;

  constructor({ feedBlocks, documentsSaved, runPass }: IndexSchedulerProps) {
    super();
    this.#feedBlocks = feedBlocks;
    this.#documentsSaved = documentsSaved;
    this.#runPass = runPass;
  }

  protected override async _open(): Promise<void> {
    this.#task = new DeferredTask(this._ctx, this.#run);
    this.#feedBlocks.on(this._ctx, ({ feedNamespace }) => {
      if (feedNamespace === FeedProtocol.WellKnownNamespaces.trace) {
        this.#scheduleTraceRun();
      } else {
        this.schedule('feed-blocks');
      }
    });
    this.#documentsSaved.on(this._ctx, () => this.schedule('documents-saved'));
    this.schedule('open');
  }

  /**
   * Drains an in-flight pass, so a waiter's `runBlocking` loop is not left to hit the disposed
   * context on its next iteration and escape as an unhandled rejection.
   */
  protected override async _close(): Promise<void> {
    await this.#task?.join();
    this.#releaseWaiters();
    this.#task = undefined;
  }

  /** Starts a pass soon, coalesced with any other request made before it starts. */
  schedule(reason: IndexRunReason): void {
    if (reason !== 'batch-continuation') {
      this.#inputGeneration++;
    }
    this.#noteReason(reason);
    this.#task?.schedule();
  }

  /**
   * Waits until every change made before the call is indexed. Changes made during the wait are left
   * to later passes, so a stream of writes cannot hold the caller. A no-op once closed: a late
   * caller has nothing to wait for, and `runBlocking` would throw on the disposed context.
   */
  async waitForIndexed(reason?: IndexRequestReason): Promise<void> {
    const task = this.#task;
    if (!task || this._ctx.disposed) {
      return;
    }
    // Waits for the inputs that existed on entry, not for the index to go idle: writes arriving faster
    // than a pass completes never leave the empty batch that idleness needs.
    const target = this.#inputGeneration;
    while (this.#indexedGeneration < target) {
      if (reason) {
        this.#noteReason(reason);
      }
      await task.runBlocking();
      if (this._ctx.disposed) {
        return;
      }
    }
    // One more pass when the last still found work, as the old wait-for-idle ended: under a quiet
    // index it is empty and gives the results the last pass invalidated time to reach their clients,
    // which callers that flush then read depend on. One, so a stream still cannot hold the caller.
    if (!this.#lastPassIdle) {
      await task.runBlocking();
    }
  }

  /**
   * Starts at most one trace-triggered run per {@link TRACE_INDEX_DELAY_MS}. The input generation is
   * bumped at once, so {@link waitForIndexed} callers still wait for these blocks; only the
   * background trigger is coalesced.
   */
  #scheduleTraceRun(): void {
    this.#inputGeneration++;
    this.#noteReason('trace-blocks');
    if (this.#traceRunPending) {
      return;
    }
    this.#traceRunPending = true;
    scheduleTask(
      this._ctx,
      () => {
        this.#traceRunPending = false;
        this.#task?.schedule();
      },
      TRACE_INDEX_DELAY_MS,
    );
  }

  /** Records why a run is wanted without scheduling it — for callers that drive the task directly. */
  #noteReason(reason: IndexRunReason): void {
    this.#pendingReasons.set(reason, (this.#pendingReasons.get(reason) ?? 0) + 1);
  }

  /** Drains the pending reasons so each run reports only the requests that produced it. */
  #takeReasons(): Record<string, number> {
    const reasons = Object.fromEntries(this.#pendingReasons);
    this.#pendingReasons.clear();
    return reasons;
  }

  /** Lets every waiter return: a closing host indexes nothing more. */
  #releaseWaiters(): void {
    this.#indexedGeneration = this.#inputGeneration;
  }

  #run = async (): Promise<void> => {
    if (this._ctx.disposed) {
      this.#releaseWaiters();
      return;
    }

    // Derived and disposed per pass: `@trace.span` derives a child of whatever ctx it is handed,
    // and a child stays on its parent's dispose list until disposed -- at three passes a second,
    // parenting those on `this._ctx` is an unbounded leak.
    const passCtx = this._ctx.derive();
    try {
      // Read before the pass reads its sources, so an input landing mid-pass is left to the next one.
      const generation = this.#inputGeneration;
      // Drained here rather than inside the pass so the span can report what triggered it.
      const result = await this.#runPass(passCtx, this.#takeReasons());
      if (!result) {
        this.#releaseWaiters();
        return;
      }
      this.#lastPassIdle = result.done;
      if (result.drained) {
        this.#indexedGeneration = Math.max(this.#indexedGeneration, generation);
      }
      if (!result.done) {
        this.schedule('batch-continuation');
      }
    } finally {
      await passCtx.dispose();
    }
  };
}
