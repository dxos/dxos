// NOTE: Esbuild does not correctly propagate TLA for modules with only "export from" syntax.
// This import is required for TLA to work correctly.
import * as wasm from '@automerge/automerge-wasm';

export * from '@automerge/automerge-wasm';
