//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

// The durable `Panproto` API: a declarative, serializable {@link Lens} between an ECHO object and a
// foreign record, plus the runner that executes it. The panproto wasm engine lives behind the separate
// `@dxos/echo-panproto/wasm` entrypoint (loaded lazily by the runner), so this surface never statically
// depends on it — the wasm implementation can be swapped or retired without touching the API.

export { Adapter, Lens, Migration } from './lens';
export { type RefType, type TextFormat, decode, encode, registerRefType, registerTextFormat } from './runner';
