//
// Copyright 2024 DXOS.org
//

import { Option, pipe } from 'effect';
import { describe, test, expect } from 'vitest';

import { AST } from '@dxos/echo-schema';

import { getFieldValue, getProperty } from './types';
import { data, view, TestSchema } from '../testing';

describe('schema', () => {
  test('JSON path', () => {
    const [p1] = AST.getPropertySignatures(TestSchema.ast);
    expect(pipe(AST.getDescriptionAnnotation(p1.type), Option.getOrNull)).to.eq('Full name.');

    const [col1, col2, col3] = view.fields;
    expect(getFieldValue(data, col1)).to.eq('Tester');
    expect(getFieldValue(data, col2)).to.eq('test@example.com');
    expect(getFieldValue(data, col3)).to.eq('11205');

    const p2 = getProperty(TestSchema, col2)!;
    expect(pipe(AST.getDescriptionAnnotation(p2), Option.getOrNull)).to.exist;

    const p3 = getProperty(TestSchema, col3)!;
    expect(pipe(AST.getDescriptionAnnotation(p3), Option.getOrNull)).to.eq('ZIP code.');
  });
});
