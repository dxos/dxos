//
// Copyright 2024 DXOS.org
//

import { Option, pipe } from 'effect';
import { describe, test, expect } from 'vitest';

import { AST } from '@dxos/echo-schema';

import { getProperty } from './ast';
import { getFieldValue } from './field';
import { testData, testView, TestSchema } from '../testing';

describe('schema', () => {
  test('JSON path', () => {
    const [p1] = AST.getPropertySignatures(TestSchema.ast);
    expect(pipe(AST.getDescriptionAnnotation(p1.type), Option.getOrNull)).to.eq('Full name.');

    const [col1, col2, col3] = testView.fields;
    expect(getFieldValue(testData, col1)).to.eq('Tester');
    expect(getFieldValue(testData, col2)).to.eq('test@example.com');
    expect(getFieldValue(testData, col3)).to.eq('11205');

    const p2 = getProperty(TestSchema, col2.path)!;
    expect(pipe(AST.getDescriptionAnnotation(p2), Option.getOrNull)).to.exist;

    const p3 = getProperty(TestSchema, col3.path)!;
    expect(pipe(AST.getDescriptionAnnotation(p3), Option.getOrNull)).to.eq('ZIP code.');
  });
});
