//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

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
});
