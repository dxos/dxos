//
// Copyright 2026 DXOS.org
//
// Ambient declarations for the Vite-specific import forms the web UI uses. Deliberately a file
// with no top-level `export`: a `declare module` inside a module would be an augmentation of an
// existing module rather than a declaration of a new one.
//

/** `?url` yields the served URL of an asset — how automerge's wasm reaches its explicit init. */
declare module '*.wasm?url' {
  const url: string;
  export default url;
}

/** The virtual CSS entry `@dxos/ui-theme`'s Vite plugin resolves at serve time. */
declare module '@dxos-theme';
