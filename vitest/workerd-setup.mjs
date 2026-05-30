//
// Copyright 2026 DXOS.org
//

// Setup for the `workerd` vitest project. The Cloudflare Workers runtime hides
// the GC-observable `FinalizationRegistry` / `WeakRef` globals (their timing is
// non-deterministic), but parts of the DXOS stack reference them at module-load
// time. Tests don't depend on GC-driven cleanup, so we install no-op shims:
// `FinalizationRegistry` never fires its callback and `WeakRef` holds a strong
// reference. This keeps modules importable inside the worker runtime.

if (typeof globalThis.FinalizationRegistry === 'undefined') {
  globalThis.FinalizationRegistry = class FinalizationRegistry {
    register() {}
    unregister() {}
  };
}

if (typeof globalThis.WeakRef === 'undefined') {
  globalThis.WeakRef = class WeakRef {
    #target;
    constructor(target) {
      this.#target = target;
    }

    deref() {
      return this.#target;
    }
  };
}
