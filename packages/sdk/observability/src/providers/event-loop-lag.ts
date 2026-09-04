//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { scheduleTaskInterval } from '@dxos/async';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';

import type * as Observability from '../Observability';

const SECONDS = { unit: 's' } as const;

/** How often the loop is probed. Short enough to catch a stall inside one export window. */
export const LAG_SAMPLE_INTERVAL_MS = 500;

/** Window the reported peak covers. Matches the metric export interval. */
export const LAG_WINDOW_MS = 60_000;

/**
 * Gap beyond which a late probe is read as the realm having been suspended rather than blocked.
 *
 * Browsers throttle or freeze timers in a hidden tab — and in the workers that tab owns — and the
 * machine can sleep, so an arbitrarily long gap is always possible for reasons that are not jank.
 * 10s because a main thread genuinely blocked that long means the app is hung rather than janky:
 * past this point the distinction stops paying, and a false reading is worse than a missed one.
 */
export const MAX_PLAUSIBLE_LAG_MS = 10_000;

/**
 * Tracks how far behind schedule a timer fires, which is how long the realm's event loop was busy.
 *
 * Reports the peak of the last completed window rather than an instantaneous value: a gauge read
 * only at collection time can never observe a stall, because a blocked loop delays the collection
 * callback itself.
 *
 * The window is rotated by {@link rotate} rather than by the read, so {@link peakMs} is a plain
 * idempotent getter. A read that consumed the value would break as soon as it ran more than once
 * per window — which `RemoteMetrics` fan-out to a second processor, or a `flush()` landing next to
 * a periodic collection, would both cause.
 */
export class EventLoopLagTracker {
  #maxInWindowMs = 0;
  #peakMs = 0;
  #lastSampleAt: number | undefined;

  constructor(
    private readonly _intervalMs: number = LAG_SAMPLE_INTERVAL_MS,
    private readonly _maxPlausibleMs: number = MAX_PLAUSIBLE_LAG_MS,
  ) {}

  /**
   * Discards the reference timestamp so the next probe cannot report lag.
   * Called when the realm was legitimately not running — a hidden tab has its timers clamped to
   * once per second or worse, which would otherwise read as tens of seconds of event-loop lag.
   */
  suspend(): void {
    this.#lastSampleAt = undefined;
  }

  /**
   * Records one probe. Lag is elapsed time beyond the scheduled interval.
   *
   * A gap past {@link MAX_PLAUSIBLE_LAG_MS} is discarded, not clamped: clamping would still report
   * a ceiling-valued stall that never happened. This has to hold without help from a visibility
   * listener, because when timers are frozen outright **no probe fires during the freeze** — so
   * nothing can mark the suspension before the first probe after it observes the entire gap.
   */
  sample(now: number): void {
    if (this.#lastSampleAt !== undefined) {
      const lagMs = Math.max(0, now - this.#lastSampleAt - this._intervalMs);
      if (lagMs > this._maxPlausibleMs) {
        log('discarding implausible event loop lag', { lagMs, maxPlausibleMs: this._maxPlausibleMs });
      } else {
        this.#maxInWindowMs = Math.max(this.#maxInWindowMs, lagMs);
      }
    }
    this.#lastSampleAt = now;
  }

  /** Peak lag observed during the last completed window. Safe to read any number of times. */
  get peakMs(): number {
    return this.#peakMs;
  }

  /** Closes the current window, publishing its peak. Driven on the export cadence. */
  rotate(): void {
    this.#peakMs = this.#maxInWindowMs;
    this.#maxInWindowMs = 0;
  }
}
/**
 * Publishes how long this realm's event loop was blocked.
 *
 * Reports peak lag per export window, tagged only by the `dxos.process.type` resource attribute —
 * so the same provider distinguishes the tab from the shared and dedicated workers without any
 * per-realm wiring.
 */
export const eventLoopLagProvider = (): Observability.DataProvider =>
  Effect.fn(function* (observability) {
    const ctx = new Context();
    const lag = new EventLoopLagTracker(LAG_SAMPLE_INTERVAL_MS);

    scheduleTaskInterval(ctx, async () => lag.sample(Date.now()), LAG_SAMPLE_INTERVAL_MS);

    // Belt to the tracker's braces. The clamp inside `sample` is what actually guarantees a frozen
    // tab is not reported as lag — checking visibility when the probe fires cannot, since a frozen
    // timer does not fire until the tab is visible again. This listener additionally drops the
    // reference timestamp the moment visibility changes, so a gap under the clamp is discarded too.
    const doc = (globalThis as { document?: EventTarget & { visibilityState?: string } }).document;
    if (doc) {
      const onVisibilityChange = () => lag.suspend();
      doc.addEventListener('visibilitychange', onVisibilityChange);
      ctx.onDispose(() => doc.removeEventListener('visibilitychange', onVisibilityChange));
    }

    // #region DEBUG
    // [DEBUG H-suspend] Dual-clock suspension probe, shipped temporarily to confirm the
    // native-app freeze diagnosis in the wild — WKWebView's WebContent process suspended while
    // the window sits hidden — before the fix lands. Remove together with the Rust host
    // heartbeat in composer-app's src-tauri/lib.rs. Runs in every realm (tab + workers); logs
    // only on a wake after a ≥15s execution gap and on visibility transitions, so steady state
    // is silent. Reading a gap line in a downloaded bundle:
    //   - wallDeltaMs ≈ monoDeltaMs → the realm did not run while both clocks did ⇒ process
    //     suspension (a 2026-08-29 dev soak showed multi-hour WebContent freezes this way,
    //     with the Rust host heartbeat clean throughout).
    //   - wallDeltaMs >> monoDeltaMs → the machine slept; not an app fault.
    const DEBUG_PROBE_INTERVAL_MS = 5_000;
    const DEBUG_GAP_MS = 15_000;
    let debugLastWall = Date.now();
    let debugLastMono = performance.now();
    scheduleTaskInterval(
      ctx,
      async () => {
        const wall = Date.now();
        const mono = performance.now();
        const wallDeltaMs = Math.round(wall - debugLastWall);
        const monoDeltaMs = Math.round(mono - debugLastMono);
        debugLastWall = wall;
        debugLastMono = mono;
        if (wallDeltaMs > DEBUG_GAP_MS || monoDeltaMs > DEBUG_GAP_MS) {
          log.info('[DEBUG H-suspend] js wake after gap', {
            wallDeltaMs,
            monoDeltaMs,
            // Portion of the gap the monotonic clock did not tick — the asleep share.
            sleptMs: wallDeltaMs - monoDeltaMs,
            visibility: doc?.visibilityState ?? 'no-document',
            hasFocus: (doc as { hasFocus?: () => boolean } | undefined)?.hasFocus?.() ?? null,
          });
        }
      },
      DEBUG_PROBE_INTERVAL_MS,
    );
    if (doc) {
      // The production listener above only drops the lag reference; this one records the
      // transition itself, so the bundle shows whether WebKit ever marked the page hidden.
      const onDebugVisibility = () =>
        log.info('[DEBUG H-suspend] visibilitychange', { visibility: doc.visibilityState });
      doc.addEventListener('visibilitychange', onDebugVisibility);
      ctx.onDispose(() => doc.removeEventListener('visibilitychange', onDebugVisibility));
      // Page lifecycle freeze/resume — Chromium-only events today, registered anyway so a WebKit
      // release that adds them shows up rather than silently discriminating nothing.
      const onDebugFreeze = () => log.info('[DEBUG H-suspend] page freeze');
      const onDebugResume = () => log.info('[DEBUG H-suspend] page resume');
      doc.addEventListener('freeze', onDebugFreeze);
      doc.addEventListener('resume', onDebugResume);
      ctx.onDispose(() => {
        doc.removeEventListener('freeze', onDebugFreeze);
        doc.removeEventListener('resume', onDebugResume);
      });
    }
    // #endregion DEBUG

    // Window rotation is driven here rather than by the read, so the gauge callback stays a plain
    // idempotent getter — see EventLoopLagTracker.
    scheduleTaskInterval(ctx, async () => lag.rotate(), LAG_WINDOW_MS);

    ctx.onDispose(
      observability.metrics.observe('dxos.client.runtime.eventLoop.lag', () => lag.peakMs / 1_000, undefined, SECONDS),
    );

    return async () => {
      await ctx.dispose();
    };
  });
