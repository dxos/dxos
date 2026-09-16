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
  /** A space's database, narrowed to the query path the perf fixture uses. */
  type DebugSpace = {
    id: string;
    db: { query: (filter: unknown) => { run: () => Promise<{ objects: unknown[] }> } };
  };

  /**
   * The client/ECHO debug hook (`window.__DXOS__`), mounted at the end of `client.initialize()`.
   *
   * Narrowed to what the specs use, per this file's convention.
   *
   * `Ref.make` takes a LIVE object, and that is the only ref an operation handler can actually
   * resolve: an operation that CREATES an object returns a JSON snapshot (`{ id, title, … }`) while
   * one that CONSUMES it takes a `Ref`, so the fixture has to read the object back. Neither
   * shortcut works — a hand-assembled `{ '/': 'echo:///<id>' }` envelope is rejected by the input
   * schema (`Expected <Declaration>`), and a `Ref.fromURI` ref is accepted but carries no resolver,
   * so the handler's `tryLoad()` fails with `Resolver is not set`.
   */
  var dxos:
    | {
        Ref?: { make?: (object: unknown) => unknown };
        Filter?: { id?: (...ids: string[]) => unknown };
        spaces?: () => DebugSpace[];
      }
    | undefined;

  /** Long-task samples accumulated by the observer the startup spec installs. */
  var __longTasks: Array<{ start: number; duration: number }> | undefined;

  /** The native-DOM boot loader driver, present until React replaces #root. */
  var __bootLoader: { status?: (...args: unknown[]) => unknown } | undefined;

  var __bootLoaderSnapshot: { hasDriver: boolean; [key: string]: unknown } | undefined;
}

export {};
