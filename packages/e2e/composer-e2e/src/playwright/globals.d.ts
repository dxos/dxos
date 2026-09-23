//
// Copyright 2026 DXOS.org
//

// Debug globals the app exposes for instrumentation, declared so the specs can read them without
// casting at every `page.evaluate` site. Everything here is optional and framework-internal: these
// hooks appear only once the app has mounted, so the call sites still guard — the declaration buys
// type-checking, not a presence guarantee.
//
// Only the hooks the BEHAVIOURAL suite reaches are declared here; the startup and perf harnesses
// keep their own (profiler, long tasks, the boot loader, `dxos.spaces`) in composer-app, so neither
// package declares a hook it does not use.

// `globalThis.composer` itself is declared by `@dxos/app-framework`; a second `var composer` here
// would collide with it and resolve every member to `{}`. Merge the app-only hooks onto its
// interface instead.
declare module '@dxos/app-framework' {
  interface ComposerDevtools {
    changeStorageVersionInMetadata?: (version: number) => void;
    /** The focused markdown editor, exposed so specs can drive selection the way a user would. */
    editorView?: {
      state: { doc: { toString: () => string } };
      dispatch: (spec: { selection: { anchor: number; head: number } }) => void;
    };
  }
}

declare global {
  /** A space, narrowed to the database members this suite uses. */
  type DebugSpace = {
    id: string;
    db: {
      /**
       * A HYDRATED reference to an object by URI (`echo:///<objectId>`), whose `.load()` resolves.
       * `Ref.fromURI` returns an unhydrated one whose `.load`/`.target` do not work.
       */
      makeRef: (uri: string) => { load: () => Promise<Record<string, unknown>> };
    };
  };

  /** Set by the suite, not the app: survives only as long as the document it was set on. */
  var e2eDocumentTag: string | undefined;

  /** The client/ECHO debug hook, mounted at the end of `client.initialize()`. */
  var dxos: { spaces?: () => DebugSpace[] } | undefined;

  /**
   * The extension APIs, narrowed to what the extension spec drives from an extension page. Declared
   * here rather than via `@types/chrome`: three members do not earn a dependency.
   */
  var chrome: {
    storage: { sync: { set: (items: Record<string, unknown>) => Promise<void> } };
    tabs: { query: (query: { url: string }) => Promise<Array<{ id?: number }>> };
    runtime: { sendMessage: (message: unknown) => Promise<unknown> };
  };
}

export {};
