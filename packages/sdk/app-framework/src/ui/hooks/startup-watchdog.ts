//
// Copyright 2025 DXOS.org
//

export type StartupStall = {
  /** Milliseconds the process is known to have executed since the watchdog started. */
  executedMs: number;
  /** Executed milliseconds since the last `progress()` call. */
  stalledForMs: number;
};

export type StartupWatchdogOptions = {
  /** Executed milliseconds without progress before `onStall` fires. */
  timeout: number;
  /** Called once, on the tick that observes the stall. The watchdog is already stopped. */
  onStall: (stall: StartupStall) => void;
  /** Tick interval. Defaults to one second. */
  sliceMs?: number;
  /** Monotonic clock, in milliseconds. Defaults to `performance.now`. */
  now?: () => number;
};

export type StartupWatchdog = {
  /** Records that startup made progress; the stall window restarts from here. */
  progress: () => void;
  /** Stops the watchdog. `onStall` never fires after this. Idempotent. */
  dispose: () => void;
};

/**
 * Detects a startup that has stopped making progress.
 *
 * The question it answers is not "has startup taken longer than `timeout`?" but "has startup
 * done nothing for `timeout` worth of actual execution?". Two things make that distinction:
 *
 * 1. **Only executed time counts.** A tick runs every `sliceMs` and credits the time since the
 *    previous tick, capped at two slices. If the process was suspended (a hidden webview on
 *    macOS, App Nap, system sleep), no ticks run while it is frozen, and the first tick after it
 *    thaws credits at most two slices no matter how long the freeze lasted. Monotonic clocks keep
 *    running through a suspension, so comparing timestamps alone would count the frozen time as
 *    a stall.
 *
 * 2. **Progress resets the window.** Each `progress()` call moves the start of the stall window to
 *    the current executed time. A slow boot that keeps activating modules can run for as long as
 *    it needs; only one with no activation for `timeout` of executed time is reported.
 *
 * `onStall` fires at most once. Call `dispose()` when startup finishes or fails so it never fires
 * for a boot that completed.
 */
export const createStartupWatchdog = ({
  timeout,
  onStall,
  sliceMs = 1_000,
  now = () => performance.now(),
}: StartupWatchdogOptions): StartupWatchdog => {
  let executedMs = 0;
  let progressAtMs = 0;
  let lastTickAt = now();

  const timer = setInterval(() => {
    const tickAt = now();
    executedMs += Math.min(tickAt - lastTickAt, 2 * sliceMs);
    lastTickAt = tickAt;
    if (executedMs - progressAtMs < timeout) {
      return;
    }
    clearInterval(timer);
    onStall({
      executedMs: Math.round(executedMs),
      stalledForMs: Math.round(executedMs - progressAtMs),
    });
  }, sliceMs);

  return {
    progress: () => {
      progressAtMs = executedMs;
    },
    dispose: () => clearInterval(timer),
  };
};
