//
// Copyright 2023 DXOS.org
//

export const randomBytes = () => {
  throw new Error('Not available on this platform');
};

// Unlike `randomBytes`, the browser has this one natively (secure contexts), so the shim forwards
// rather than throwing.
export const randomUUID = () => globalThis.crypto.randomUUID();
