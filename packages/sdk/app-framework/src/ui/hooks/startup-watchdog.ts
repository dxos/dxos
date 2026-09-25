//
// Copyright 2025 DXOS.org
//

/** Interval between watchdog ticks. Each tick credits at most two intervals of executed time. */
export const STARTUP_WATCHDOG_TICK_MS = 1_000;

export type StartupWatchdogOptions = {
  stallMs: number;
  onStall: (stall: { executedMs: number }) => void;
};

export type StartupWatchdog = {
  progress: () => void;
  dispose: () => void;
};

/**
 * Detects a startup that has stopped making progress.
 *
 * The question it answers is not "has startup taken longer than `stallMs`?" but "has startup
 * done nothing for `stallMs` worth of actual execution?". Two things make that distinction:
 *
 * 1. **Only executed time counts.** A tick runs every second and credits the time since the
 *    previous tick, capped at two seconds. If the process was suspended (a hidden webview on
 *    macOS, App Nap, system sleep), no ticks run while it is frozen, and the first tick after it
 *    thaws credits at most two seconds no matter how long the freeze lasted. `performance.now`
 *    keeps advancing through a suspension, so comparing timestamps alone would count the frozen
 *    time as a stall.
 *
 * 2. **Progress resets the window.** Each `progress()` call moves the start of the stall window to
 *    the current executed time. A slow boot that keeps activating modules can run for as long as
 *    it needs; only one with no activation for `stallMs` of executed time is reported.
 *
 * `onStall` fires at most once. Call `dispose()` when startup finishes or fails so it never fires
 * for a boot that completed.
 */
export const createStartupWatchdog = ({ stallMs, onStall }: StartupWatchdogOptions): StartupWatchdog => {
  let executedMs = 0;
  let progressAtMs = 0;
  let lastTickAt = performance.now();

  const timer = setInterval(() => {
    const tickAt = performance.now();
    executedMs += Math.min(tickAt - lastTickAt, 2 * STARTUP_WATCHDOG_TICK_MS);
    lastTickAt = tickAt;
    if (executedMs - progressAtMs < stallMs) {
      return;
    }
    clearInterval(timer);
    onStall({ executedMs: Math.round(executedMs) });
  }, STARTUP_WATCHDOG_TICK_MS);

  return {
    progress: () => {
      progressAtMs = executedMs;
    },
    dispose: () => clearInterval(timer),
  };
};
