//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { getNumericConstraints } from './numeric-constraints.ts';

describe('getNumericConstraints', () => {
  test('reads min/max from Schema.between (bounds live on separate nested refinements)', ({ expect }) => {
    const { ast } = Schema.Number.pipe(Schema.check(Schema.isBetween({ minimum: 0, maximum: 23 })));
    expect(getNumericConstraints(ast)).toEqual({ min: 0, max: 23, integer: false });
  });

  test('detects integer from Schema.int', ({ expect }) => {
    const { ast } = Schema.Number.pipe(
      Schema.check(Schema.isInt()),
      Schema.check(Schema.isBetween({ minimum: 0, maximum: 23 })),
    );
    expect(getNumericConstraints(ast)).toEqual({ min: 0, max: 23, integer: true });
  });

  test('returns empty constraints for an unconstrained number', ({ expect }) => {
    expect(getNumericConstraints(Schema.Number.ast)).toEqual({ integer: false });
  });

  test('aggregates stacked bounds to the strictest (intersection semantics)', ({ expect }) => {
    const { ast } = Schema.Number.pipe(
      Schema.check(Schema.isGreaterThanOrEqualTo(5)),
      Schema.check(Schema.isGreaterThanOrEqualTo(10)),
    );
    expect(getNumericConstraints(ast)).toEqual({ min: 10, max: undefined, integer: false });
  });
});
