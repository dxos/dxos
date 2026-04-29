//
// Copyright 2026 DXOS.org
//

/**
 * Producer side of the cross-plugin "recovery in progress" signal: setting
 * this flag tells the privacy-notice handler in plugin-observability that
 * the user is *recovering* an existing identity, not creating a new one,
 * so the privacy toast should be skipped for this session.
 *
 * Lives here (not in plugin-observability) to keep the plugin-client →
 * plugin-observability import edge clean -- importing across that edge
 * pulls plugin-observability's React-surface module into CLI bun bundles,
 * where the opentui/solid plugin then mistransforms it. The flag's
 * coordination contract is the sessionStorage key, not a shared module.
 *
 * The reader (`consumeRecoveryFlag`) lives in plugin-observability.
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
