//
// Copyright 2026 DXOS.org
//

// Debug globals the app exposes for instrumentation, declared so the specs can read them without
// casting at every `page.evaluate` site. Everything here is optional and framework-internal: these
// hooks appear only once the app has mounted (and `composer.manager` only after React does), so the
// call sites still guard — the declaration buys type-checking, not a presence guarantee.
//
// `var` rather than `interface Window`, because the specs reach them through both `window` and
// `globalThis` depending on which context the evaluate body runs in.

import type { ProfilerSnapshot } from '../util/profiler';

// `globalThis.composer` itself is declared by `@dxos/app-framework`; a second `var composer` here
// would collide with it and resolve every member to `{}`. Merge the app-only hooks onto its
// interface instead.
declare module '@dxos/app-framework' {
  interface ComposerDevtools {
    profiler?: { snapshot?: () => ProfilerSnapshot };
    changeStorageVersionInMetadata?: (version: number) => void;
  }
}

declare global {
  /** Long-task samples accumulated by the observer the startup spec installs. */
  var __longTasks: Array<{ start: number; duration: number }> | undefined;

  /** The native-DOM boot loader driver, present until React replaces #root. */
  var __bootLoader: { status?: (...args: unknown[]) => unknown } | undefined;

  var __bootLoaderSnapshot: { hasDriver: boolean; [key: string]: unknown } | undefined;
}

export {};
