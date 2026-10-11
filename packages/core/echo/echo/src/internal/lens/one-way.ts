//
// Copyright 2026 DXOS.org
//

import { type OneWaySpec } from './types.ts';

//
// One-way transforms are data, so every device — a host without the app's code included — computes the
// same value from the same source properties.
//

/** The value `spec` computes from `source`, or `undefined` when an input it needs is absent. */
export const evaluate = (spec: OneWaySpec, source: Readonly<Record<string, unknown>>): unknown => {
  switch (spec.fn) {
    case 'concat': {
      const parts = spec.from.map((property) => source[property]).filter((value) => value !== undefined);
      return parts.length === 0 ? undefined : parts.map(String).join(spec.separator);
    }
    case 'part': {
      const value = source[spec.from[0]];
      return typeof value === 'string' ? (value.split(spec.separator)[spec.index] ?? '') : undefined;
    }
    case 'mapValue': {
      const value = source[spec.from[0]];
      if (value === undefined) {
        return undefined;
      }
      const key = String(value);
      return Object.hasOwn(spec.table, key) ? spec.table[key] : spec.fallback;
    }
    case 'constant':
      return spec.value;
  }
};
