//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { S, getAnnotation, getProperty } from '@dxos/effect';
import { invariant } from '@dxos/invariant';

import { EmailFormat, type PatternAnnotation, PatternAnnotationId } from './annotations';

describe('Annotations', () => {
  test('numbers', () => {
    const Test = S.Struct({ value: S.String.annotations({ [PatternAnnotationId]: EmailFormat }) });
    type Test = S.Schema.Type<typeof Test>;
    const value: Test = { value: 'test@example.com' };

    const field = getProperty(Test, 'value');
    invariant(field);

    const { filter } = getAnnotation<PatternAnnotation>(PatternAnnotationId, field) ?? {};
    invariant(filter);
    expect(filter.test(value.value)).to.exist;
  });
});
