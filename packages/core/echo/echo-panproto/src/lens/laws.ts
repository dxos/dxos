//
// Copyright 2026 DXOS.org
//

import { Obj } from '@dxos/echo';

import { readSource } from './mapping.ts';
import { type AnyLens, type Write } from './types.ts';

//
// The GetPut law over the base object: reading a view and putting it straight back must change
// nothing. That is the failure a hand-written mapper pair hides — a `get` that normalizes or defaults
// a value, paired with a `put` that writes the normalized form back, silently rewrites the object on
// every save.
//
// PutGet (write an arbitrary value, read it back) is deliberately not checked here: it requires
// mutating the object, so it needs a clone or a sample generator. GetPut is pure, and in practice it
// catches the defects that matter.
//

export type LawViolation = {
  readonly law: 'GetPut';
  /** The target property whose round trip failed. */
  readonly property: string;
  /** The source path the write would have touched. */
  readonly path: string;
  readonly expected?: unknown;
  readonly actual?: unknown;
};

export type LawCheckResult = {
  readonly holds: boolean;
  readonly violations: readonly LawViolation[];
  /** Properties skipped because they are read-only, so no round trip is defined. */
  readonly readOnly: readonly string[];
};

/** Floating-point conversions (unit scaling) are not exact, so numbers compare within a tolerance. */
const EPSILON = 1e-9;

const equal = (a: unknown, b: unknown): boolean => {
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) <= EPSILON * Math.max(1, Math.abs(a), Math.abs(b));
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((value, index) => equal(value, b[index]));
  }
  // A derived `put` that rebuilds a struct returns a new object every time, so reference equality
  // would report a GetPut violation for values that match.
  if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
    const left = a as Record<string, unknown>;
    const right = b as Record<string, unknown>;
    const keys = Object.keys(left);
    return keys.length === Object.keys(right).length && keys.every((key) => equal(left[key], right[key]));
  }
  return a === b;
};

/**
 * Check GetPut against a live object, using its current values as the sample.
 *
 * Every target property is inverted on its own (so a violation names the property responsible), and
 * then the whole view is inverted at once (which catches two properties that write the same source
 * property inconsistently). Nothing is mutated: the intended writes are compared against what the
 * object already holds.
 */
export const checkLaws = (obj: Obj.Unknown, lens: AnyLens): LawCheckResult => {
  const violations: LawViolation[] = [];
  const readOnly: string[] = [];

  const view = lens.get(obj) as Record<string, unknown>;
  const writable: string[] = [];
  for (const [property, value] of Object.entries(view)) {
    if (property === 'id') {
      continue;
    }
    const entry = lens.plan?.entries.find((candidate) => candidate.property === property);
    if (entry && !entry.put) {
      readOnly.push(property);
      continue;
    }
    writable.push(property);

    for (const write of lens.put({ [property]: value }, obj)) {
      const observed = observe(obj, write);
      if (!equal(observed.next, observed.current)) {
        violations.push({
          law: 'GetPut',
          property,
          path: describe(write),
          expected: observed.current,
          actual: observed.next,
        });
      }
    }
  }

  // Inverting the full view at once: catches two target properties writing one source property.
  const whole = Object.fromEntries(writable.map((key) => [key, view[key]]));
  for (const write of lens.put(whole, obj)) {
    const observed = observe(obj, write);
    if (!equal(observed.next, observed.current)) {
      const path = describe(write);
      if (!violations.some((violation) => violation.path === path)) {
        violations.push({ law: 'GetPut', property: path, path, expected: observed.current, actual: observed.next });
      }
    }
  }

  return { holds: violations.length === 0, violations, readOnly };
};

const describe = (write: Write): string =>
  write.kind === 'overlay' ? write.property : write.path.map(String).join('.');

/** The value a write would produce next to the value already there — without applying it. */
const observe = (obj: Obj.Unknown, write: Write): { current: unknown; next: unknown } => {
  switch (write.kind) {
    case 'assign':
      return { current: Obj.getValue(obj, write.path), next: write.value };
    case 'overlay':
      // Overlays have no source counterpart, so a round trip through them is trivially total.
      return { current: write.value, next: write.value };
    case 'splice':
      // A splice is a range edit; comparing it to a whole-string read is not meaningful.
      return { current: undefined, next: undefined };
  }
};

/** The source properties a lens reads, for asserting a mapping still covers what it claims. */
export const readsOf = (lens: AnyLens): readonly string[] => [
  ...new Set(lens.plan?.entries.flatMap((entry) => entry.from) ?? []),
];

/** Read the source values a mapping entry declares, for tests that assert `from` is honest. */
export const sourceFor = (obj: Obj.Unknown, lens: AnyLens, property: string): Record<string, unknown> => {
  const entry = lens.plan?.entries.find((candidate) => candidate.property === property);
  return entry ? readSource((name) => Obj.getValue(obj, [name]), entry.from) : {};
};
