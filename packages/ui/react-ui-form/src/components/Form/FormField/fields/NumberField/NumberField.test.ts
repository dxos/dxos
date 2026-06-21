//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { getNumericConstraints } from './NumberField';

describe('getNumericConstraints', () => {
  test('reads min/max from Schema.between (bounds live on separate nested refinements)', ({ expect }) => {
    const { ast } = Schema.Number.pipe(Schema.between(0, 23));
    expect(getNumericConstraints(ast)).toEqual({ min: 0, max: 23, integer: false });
  });

  test('detects integer from Schema.int', ({ expect }) => {
    const { ast } = Schema.Number.pipe(Schema.int(), Schema.between(0, 23));
    expect(getNumericConstraints(ast)).toEqual({ min: 0, max: 23, integer: true });
  });

  test('returns empty constraints for an unconstrained number', ({ expect }) => {
    expect(getNumericConstraints(Schema.Number.ast)).toEqual({ integer: false });
  });

  test('aggregates stacked bounds to the strictest (intersection semantics)', ({ expect }) => {
    const { ast } = Schema.Number.pipe(Schema.greaterThanOrEqualTo(5), Schema.greaterThanOrEqualTo(10));
    expect(getNumericConstraints(ast)).toEqual({ min: 10, max: undefined, integer: false });
  });
});
