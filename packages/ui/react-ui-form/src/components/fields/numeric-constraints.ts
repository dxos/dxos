//
// Copyright 2024 DXOS.org
//

import { SchemaAST } from '@dxos/effect';

// Kept out of `NumberField.tsx`: react-refresh only fast-refreshes a module whose
// exports are all components, so values exported beside them force a full page reload on every edit.

/** The `representation` annotation a v4 check carries, naming the filter and its payload. */
type CheckRepresentation = { readonly id?: string; readonly payload?: Record<string, unknown> | null };

const representationOf = (check: SchemaAST.Check<any>): CheckRepresentation | undefined =>
  (check.annotations as { representation?: CheckRepresentation } | undefined)?.representation;

const numberAt = (payload: CheckRepresentation['payload'], key: string): number | undefined => {
  const value = payload?.[key];
  return typeof value === 'number' ? value : undefined;
};

/**
 * Extracts numeric constraints (`minimum`/`maximum` bounds and whether the value must be an integer)
 * from the checks attached to the node (e.g. produced by `Schema.isBetween` / `Schema.isInt`).
 * Returns empty constraints when none are declared.
 *
 * Effect 4 has no `Refinement` node: refinements are checks on the node itself, each carrying a
 * `representation` annotation naming the filter and its payload.
 */
export const getNumericConstraints = (ast: SchemaAST.AST): { min?: number; max?: number; integer: boolean } => {
  let min: number | undefined;
  let max: number | undefined;
  let integer = false;

  // Stacked checks intersect: keep the strictest bound (largest min, smallest max).
  const tighten = (lower?: number, upper?: number) => {
    if (lower !== undefined) {
      min = min === undefined ? lower : Math.max(min, lower);
    }
    if (upper !== undefined) {
      max = max === undefined ? upper : Math.min(max, upper);
    }
  };

  for (const check of SchemaAST.getChecks(ast)) {
    const representation = representationOf(check);
    switch (representation?.id) {
      case 'effect/schema/isBetween':
        tighten(numberAt(representation.payload, 'minimum'), numberAt(representation.payload, 'maximum'));
        break;
      case 'effect/schema/isGreaterThanOrEqualTo':
        tighten(numberAt(representation.payload, 'minimum'), undefined);
        break;
      case 'effect/schema/isLessThanOrEqualTo':
        tighten(undefined, numberAt(representation.payload, 'maximum'));
        break;
      case 'effect/schema/isInt':
        integer = true;
        break;
      case 'effect/schema/isMultipleOf':
        integer ||= numberAt(representation.payload, 'divisor') === 1;
        break;
    }
  }

  return { min, max, integer };
};
