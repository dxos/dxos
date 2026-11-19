//
// Copyright 2026 DXOS.org
//

/** Why a tab stopped and showed the paused page. */
export type PausedReason = 'unresponsive' | 'stolen' | 'superseded' | 'contention';

const PAUSED_PAGE = '/paused.html';

// One-shot flag the paused page leaves for the app, so the next boot takes the worker over.
const TAKEOVER_KEY = 'dxos.composer.takeover';

/** The builds involved, as build times (ms since epoch), for the page's details. */
export type PausedVersions = {
  /** The build this tab ran. */
  version: number;
  /** The build in the other tab, when it differs. */
  otherVersion?: number;
};

/** Query parameters the paused page reads. */
export const PausedParam = {
  REASON: 'reason',
  FROM: 'from',
  VERSION: 'version',
  OTHER_VERSION: 'otherVersion',
} as const;

/**
 * Leaves the app for the paused page, which offers to continue in this tab. Replacing the entry keeps
 * Back from re-entering an app that would only pause again.
 */
export const showPausedPage = (reason: PausedReason, { version, otherVersion }: PausedVersions): void => {
  const params = new URLSearchParams({
    [PausedParam.REASON]: reason,
    [PausedParam.FROM]: `${location.pathname}${location.search}${location.hash}`,
    [PausedParam.VERSION]: String(version),
  });
  if (otherVersion !== undefined) {
    params.set(PausedParam.OTHER_VERSION, String(otherVersion));
  }
  location.replace(`${PAUSED_PAGE}?${params}`);
};

/** Returns to the app at `from`, which then takes the worker over from whichever tab holds it. */
export const continueHere = (from: string | null): void => {
  try {
    sessionStorage.setItem(TAKEOVER_KEY, '1');
  } catch {
    // Without the flag the app still opens; it just does not take over at once.
  }
  // Only a same-origin path, so a crafted link cannot send the user elsewhere.
  location.replace(from?.startsWith('/') && !from.startsWith('//') ? from : '/');
};

/** Whether the user chose this tab on the paused page; reading it clears it. */
export const consumeTakeover = (): boolean => {
  try {
    const requested = sessionStorage.getItem(TAKEOVER_KEY) === '1';
    sessionStorage.removeItem(TAKEOVER_KEY);
    return requested;
  } catch {
    return false;
  }
};
