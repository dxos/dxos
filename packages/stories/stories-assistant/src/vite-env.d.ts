//
// Copyright 2026 DXOS.org
//

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** `<keyId>:<keySecret>` for the Higgsfield stories; absent ⇒ no credential seeded. */
  readonly VITE_HIGGSFIELD_CREDENTIALS: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
