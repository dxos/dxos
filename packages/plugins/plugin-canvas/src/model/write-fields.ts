//
// Copyright 2026 DXOS.org
//

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

/**
 * Brings `target` (a stored record, e.g. an ECHO element) from `before` to `after` by assigning only the leaves that
 * differ, recursing into records both sides hold: replacing a whole record makes a new Automerge map, which drops a
 * peer's concurrent edit to any of its other fields on merge. Arrays and new records are set whole.
 */
export const writeFields = (target: Record<string, unknown>, before: unknown, after: unknown): void => {
  const from = isRecord(before) ? before : {};
  const to = isRecord(after) ? after : {};
  for (const key of new Set([...Object.keys(from), ...Object.keys(to)])) {
    const previous = from[key];
    const next = to[key];
    if (next === undefined) {
      key in target && delete target[key];
      continue;
    }
    if (same(previous, next)) {
      continue;
    }
    const current = target[key];
    if (isRecord(previous) && isRecord(next) && isRecord(current)) {
      writeFields(current, previous, next);
    } else {
      target[key] = next;
    }
  }
};
