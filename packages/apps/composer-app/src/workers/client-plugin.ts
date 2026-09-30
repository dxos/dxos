//
// Copyright 2026 DXOS.org
//

import { initEchoHostWasm } from '../util/automerge-wasm.ts';

// Composer resolves automerge to its `slim` entry, which needs explicit wasm initialization in the
// bundle that calls it. A worker plugin URL is built as a bundle of its own, with its own copy of the
// wasm glue, so the plugin that hosts echo initializes it here, before the worker activates it.
await initEchoHostWasm();

export { default } from '@dxos/plugin-client/worker';
