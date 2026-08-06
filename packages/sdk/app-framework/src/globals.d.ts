//
// Copyright 2026 DXOS.org
//

/**
 * The Prioritized Task Scheduling API. `lib.dom` declares `scheduler` on `Window`, but this
 * package also builds for node and workerd, where `globalThis` is not a `Window` — so reading it
 * off `globalThis` needs the declaration widened here rather than an assertion at each use.
 * Optional because only recent Chromium ships it; callers feature-test.
 */
declare global {
  // eslint-disable-next-line no-var
  var scheduler: Scheduler | undefined;
}

export {};
