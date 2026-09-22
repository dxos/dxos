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

export {};
