//
// Copyright 2026 DXOS.org
//

import { PublicKey } from '@dxos/keys';

// Space keys are raw P-256 keys (65 bytes) while other keys are 32 bytes, so accept any whole-byte hex string.
const HEX_BYTES = /^(?:[0-9a-f]{2})+$/i;

export const readJoinSpaceKey = (url: URL, prop: string): PublicKey | undefined => {
  const value = url.searchParams.get(prop);
  return value && HEX_BYTES.test(value) ? PublicKey.safeFrom(value) : undefined;
};
