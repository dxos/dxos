//
// Copyright 2026 DXOS.org
//

type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

/**
 * The wasm-bindgen init for `@automerge/automerge-subduction` (web target): fetches, compiles,
 * and instantiates the wasm module. Must complete before any subduction API call in this realm.
 */
declare const initSubductionWasm: (input?: { module_or_path: InitInput | Promise<InitInput> }) => Promise<unknown>;

export default initSubductionWasm;
