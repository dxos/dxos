//
// Copyright 2026 DXOS.org
//

/**
 * Whether a human-driven story boots a persistent client. Kept in `localStorage` rather than story
 * args because the choice has to be known before the client boots — a persistent config swaps in
 * the worker pair — so a change takes effect on the next reload, not on re-render.
 */
const STORAGE_KEY = 'dxos.org/stories-assistant/persistent';

export const isPersistent = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'false';
  } catch {
    return true;
  }
};

export const setPersistent = (persistent: boolean): void => {
  localStorage.setItem(STORAGE_KEY, String(persistent));
};
