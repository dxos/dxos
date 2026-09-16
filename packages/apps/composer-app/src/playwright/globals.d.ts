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
  /** A space, narrowed to the database method the perf fixture uses. */
  type DebugSpace = {
    id: string;
    db: {
      /**
       * A HYDRATED reference to an object by URI (`echo:///<objectId>`).
       *
       * `Database.makeRef` is documented as the one to prefer over `Ref.fromURI`, which returns an
       * unhydrated reference whose `.load`/`.target` do not work — the fixture needs the former,
       * because the operation handler resolves the ref it is handed.
       */
      makeRef: (uri: string) => unknown;
    };
  };

  /**
   * The client/ECHO debug hook (`window.__DXOS__`), mounted at the end of `client.initialize()`.
   *
   * Narrowed to what the specs use, per this file's convention.
   *
   * Only `db.makeRef` is needed: an operation that CREATES an object returns a JSON snapshot
   * (`{ id, title, … }`) while one that CONSUMES it takes a `Ref`, and neither obvious shortcut
   * bridges them — a hand-assembled `{ '/': 'echo:///<id>' }` envelope is rejected by the input
   * schema (`Expected <Declaration>`), and `Ref.fromURI` yields an unhydrated ref whose resolution
   * fails with `Resolver is not set`.
   */
  var dxos:
    | {
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
