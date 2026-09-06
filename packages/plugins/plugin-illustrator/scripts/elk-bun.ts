//
// Copyright 2026 DXOS.org
//

//
// elkjs's bundled worker module decides "I am inside a web worker" from `typeof self`, and bun
// defines `self` on the main thread, so under bun it installs `self.onmessage` instead of exporting
// `Worker` and `new ELK()` throws. Undefining `self` before elkjs loads restores the node path.
// Import this module first (before anything that imports elkjs); it is a no-op elsewhere.
//

if (typeof process !== 'undefined' && process.versions?.bun && typeof globalThis.self !== 'undefined') {
  delete (globalThis as { self?: unknown }).self;
}
