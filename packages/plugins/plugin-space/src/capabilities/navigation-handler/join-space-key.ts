//
// Copyright 2026 DXOS.org
//

import { PublicKey } from '@dxos/keys';

/** How long to wait for an online member to hand over the admission credential. */
export const JOIN_BY_KEY_TIMEOUT = 60_000;

const HEX_PUBLIC_KEY = /^[0-9a-f]{64}$/i;

export const readJoinSpaceKey = (url: URL, prop: string): PublicKey | undefined => {
  const value = url.searchParams.get(prop);
  return value && HEX_PUBLIC_KEY.test(value) ? PublicKey.from(value) : undefined;
};
