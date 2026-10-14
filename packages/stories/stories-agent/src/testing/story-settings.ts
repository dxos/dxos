//
// Copyright 2026 DXOS.org
//

/**
 * Boot settings for the live stories, kept in `localStorage` rather than story args because the client reads them
 * before it boots (a persistent config swaps in the worker pair), so a change takes effect on the next reload.
 */

export const EDGE_ENVIRONMENTS = ['local', 'dev', 'preview', 'production'] as const;

export type EdgeEnvironment = (typeof EDGE_ENVIRONMENTS)[number];

const PERSISTENT_KEY = 'dxos.org/stories-agent/persistent';
const EDGE_KEY = 'dxos.org/stories-agent/edge';

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

/** Records a setting for the next boot; false when storage refused it, so a reload would not apply it. */
const write = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

const isEdgeEnvironment = (value: string | null): value is EdgeEnvironment =>
  EDGE_ENVIRONMENTS.some((environment) => environment === value);

/** Whether the next boot keeps its profile across reloads; storage that cannot be read counts as the default. */
export const isPersistent = (): boolean => read(PERSISTENT_KEY) !== 'false';

export const setPersistent = (persistent: boolean): boolean => write(PERSISTENT_KEY, String(persistent));

/** The EDGE the next boot talks to; local (`node scripts/stack.mjs start` in dxos/edge) unless chosen otherwise. */
export const getEdgeEnvironment = (): EdgeEnvironment => {
  const value = read(EDGE_KEY);
  return isEdgeEnvironment(value) ? value : 'local';
};

export const setEdgeEnvironment = (environment: EdgeEnvironment): boolean => write(EDGE_KEY, environment);
