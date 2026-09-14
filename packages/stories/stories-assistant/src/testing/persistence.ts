//
// Copyright 2026 DXOS.org
//

/**
 * Whether a human-driven story boots a persistent client. Kept in `localStorage` rather than story
 * args because the choice has to be known before the client boots — a persistent config swaps in
 * the worker pair — so a change takes effect on the next reload, not on re-render.
 */
const STORAGE_KEY = 'dxos.org/stories-assistant/persistent';

/** Whether the next boot is persistent; storage that cannot be read counts as the default. */
export const isPersistent = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
};

/** Records the choice for the next boot; false when storage refused it, so a reload would not apply it. */
export const setPersistent = (persistent: boolean): boolean => {
  try {
    localStorage.setItem(STORAGE_KEY, String(persistent));
    return true;
  } catch {
    return false;
  }
};
