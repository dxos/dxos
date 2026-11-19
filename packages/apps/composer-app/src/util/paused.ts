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

/**
 * `from` as a URL on this origin, or `/`. Parsed rather than prefix-checked, since `/\host` reads as
 * a path but resolves to another origin, so a crafted link could send the user elsewhere.
 */
const sameOriginUrl = (from: string | null): string => {
  if (!from) {
    return '/';
  }
  try {
    const destination = new URL(from, location.href);
    // The full URL, not its path: a path like `//host` would itself read as another origin.
    return destination.origin === location.origin ? destination.href : '/';
  } catch {
    return '/';
  }
};

/** Returns to the app at `from`, which then takes the worker over from whichever tab holds it. */
export const continueHere = (from: string | null): void => {
  try {
    sessionStorage.setItem(TAKEOVER_KEY, '1');
  } catch {
    // Without the flag the app still opens; it just does not take over at once.
  }
  location.replace(sameOriginUrl(from));
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
