//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { VECTOR_AXIS_LAYOUT } from '@dxos/ui-types';

import { NumberLayoutAnnotation } from '../../annotations.ts';
import { numberLayoutOf } from './number-layout.ts';

describe('numberLayoutOf', () => {
  test('a vector axis declares end alignment and hover steppers', () => {
    const axis = Schema.Number.pipe(NumberLayoutAnnotation.set({ align: 'end', stepperOnHover: true }));
    expect(numberLayoutOf(axis.ast)).toEqual({ align: 'end', stepperOnHover: true });
  });

  test('a plain number keeps the default layout', () => {
    expect(numberLayoutOf(Schema.Number.ast)).toEqual({});
  });

  test("a vector's axes take the default input size, now that they stack one per row", () => {
    expect(VECTOR_AXIS_LAYOUT.size).toBeUndefined();
  });
});
