//
// Copyright 2026 DXOS.org
//

// Debug globals the app exposes for instrumentation, declared so the specs can read them without
// casting at every `page.evaluate` site. Everything here is optional and framework-internal: these
// hooks appear only once the app has mounted (and `composer.manager` only after React does), so the
// call sites still guard — the declaration buys type-checking, not a presence guarantee.

import type * as Plugin from '@dxos/app-framework/Plugin';

import type { ProfilerSnapshot } from '../util/profiler';

// `globalThis.composer` itself is declared by `@dxos/app-framework`; a second `var composer` here
// would collide with it and resolve every member to `{}`. Merge the app-only hooks onto its
// interface instead.
declare module '@dxos/app-framework' {
  interface ComposerDevtools {
    profiler?: { snapshot?: () => ProfilerSnapshot };
    changeStorageVersionInMetadata?: (version: number) => void;
    /** The plugin manager; readers narrow the module shape to what they use. */
    manager?: { getModules?: () => readonly Plugin.PluginModule[] };
    /** The focused markdown editor, exposed so specs can drive selection the way a user would. */
    editorView?: {
      state: { doc: { toString: () => string } };
      dispatch: (spec: { selection: { anchor: number; head: number } }) => void;
    };
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
