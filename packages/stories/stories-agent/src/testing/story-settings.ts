//
// Copyright 2026 DXOS.org
//

/**
 * The EDGE the live stories boot against, kept in `localStorage` so the toolbar's choice survives the reload that applies
 * it; whether the profile persists is a story arg instead.
 */

export const EDGE_ENVIRONMENTS = ['local', 'dev', 'preview', 'production'] as const;

export type EdgeEnvironment = (typeof EDGE_ENVIRONMENTS)[number];

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

/** The EDGE the next boot talks to; local (`node scripts/stack.mjs start` in dxos/edge) unless chosen otherwise. */
export const getEdgeEnvironment = (): EdgeEnvironment => {
  const value = read(EDGE_KEY);
  return isEdgeEnvironment(value) ? value : 'local';
};

export const setEdgeEnvironment = (environment: EdgeEnvironment): boolean => write(EDGE_KEY, environment);
