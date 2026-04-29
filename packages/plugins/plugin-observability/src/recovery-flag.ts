//
// Copyright 2026 DXOS.org
//

/**
 * Cross-plugin signal: a recovery flow is in progress, so the privacy notice
 * shouldn't fire when an identity becomes available.
 *
 * The privacy notice is targeted at users *creating* a new identity (the
 * first time they share data with us); recovering an existing identity isn't
 * a new consent moment. Plugin-client's recovery operation handlers
 * (`RedeemToken`, `RedeemPasskey`) call `markRecoveryInProgress()` before
 * invoking `IdentityService.recoverIdentity`; the privacy-notice handler
 * calls `consumeRecoveryFlag()` to read-and-clear the flag once.
 *
 * Scoped to `sessionStorage` so the flag clears on tab close, never persists
 * across sessions, and isn't shared between tabs (each tab decides
 * independently whether its current identity arrived via recovery).
 */
const KEY = 'dxos.identity.recovering';

export const markRecoveryInProgress = (): void => {
  try {
    sessionStorage.setItem(KEY, '1');
  } catch {
    // sessionStorage may be unavailable (SSR, sandbox); the flag is a
    // best-effort UX hint, not a correctness invariant.
  }
};

export const consumeRecoveryFlag = (): boolean => {
  try {
    const value = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return value === '1';
  } catch {
    return false;
  }
};
