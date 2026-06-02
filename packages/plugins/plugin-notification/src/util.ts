//
// Copyright 2026 DXOS.org
//

/** Decode a base64url VAPID public key into the `Uint8Array` `pushManager.subscribe` expects. */
export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index++) {
    output[index] = raw.charCodeAt(index);
  }
  return output;
};

/** The VAPID public key, injected at build time. */
export const getVapidPublicKey = (): string | undefined => import.meta.env.VITE_VAPID_PUBLIC_KEY;
