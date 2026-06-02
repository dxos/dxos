//
// Copyright 2026 DXOS.org
//

interface ImportMetaEnv {
  /** Base64url-encoded VAPID public key for Web Push subscription. */
  readonly VITE_VAPID_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
