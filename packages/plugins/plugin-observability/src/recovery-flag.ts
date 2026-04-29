//
// Copyright 2026 DXOS.org
//

/**
 * Consumer side of the cross-plugin "recovery in progress" signal: the
 * privacy notice should be skipped for users *recovering* an existing
 * identity (rather than creating a new one and consenting for the first
 * time). The producer (plugin-client's recovery operation handlers) sets
 * this same `sessionStorage` key before invoking
 * `IdentityService.recoverIdentity`. The flag is read-and-cleared on the
 * first call, so any later identity-creation event (from a different flow)
 * fires the notice as usual.
 *
 * Lives here, not in the producer plugin, to keep the import edge from
 * plugin-client → plugin-observability one-directional. The contract
 * between the two sides is the storage key string, not a shared module.
 */
const KEY = 'dxos.identity.recovering';

export const consumeRecoveryFlag = (): boolean => {
  try {
    const value = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return value === '1';
  } catch {
    return false;
  }
};
