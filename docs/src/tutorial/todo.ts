//
// Copyright 2026 DXOS.org
//

/**
 * The starter puts a placeholder where a learning-path page has the reader
 * write code; the app checks for one before it uses that piece.
 */
const placeholders = new WeakMap<object, string>();

/** A placeholder for the code that `step` writes. */
export function todo(step: string): never;
export function todo(step: string): unknown {
  const placeholder = Object.freeze({});
  placeholders.set(placeholder, step);
  return placeholder;
}

/** The step that writes `value`, if `value` is still a placeholder. */
export const todoStep = (value: unknown): string | undefined =>
  typeof value === 'object' && value !== null
    ? placeholders.get(value)
    : undefined;
