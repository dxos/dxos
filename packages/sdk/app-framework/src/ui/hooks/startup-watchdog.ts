//
// Copyright 2025 DXOS.org
//

const SLICE_MS = 1_000;

export type StartupWatchdogOptions = {
  /** Executed milliseconds without progress before `onStall` fires. */
  timeout: number;
  /** Called once, on the tick that observes the stall. The watchdog is already stopped. */
  onStall: (stall: { executedMs: number }) => void;
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
 * 1. **Only executed time counts.** A tick runs every second and credits the time since the
 *    previous tick, capped at two seconds. If the process was suspended (a hidden webview on
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
export const createStartupWatchdog = ({ timeout, onStall }: StartupWatchdogOptions): StartupWatchdog => {
  let executedMs = 0;
  let progressAtMs = 0;
  let lastTickAt = performance.now();

  const timer = setInterval(() => {
    const tickAt = performance.now();
    executedMs += Math.min(tickAt - lastTickAt, 2 * SLICE_MS);
    lastTickAt = tickAt;
    if (executedMs - progressAtMs < timeout) {
      return;
    }
    clearInterval(timer);
    onStall({ executedMs: Math.round(executedMs) });
  }, SLICE_MS);

  return {
    progress: () => {
      progressAtMs = executedMs;
    },
    dispose: () => clearInterval(timer),
  };
};
