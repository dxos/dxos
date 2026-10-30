//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as SchemaAST from 'effect/SchemaAST';
import { describe, expect, test } from 'vitest';

import { NumberLayoutAnnotation } from '@dxos/react-ui-form';
import { VECTOR_AXIS_LAYOUT } from '@dxos/ui-types';

import { nodeBase } from './types.ts';

const axisLayout = (schema: { ast: SchemaAST.AST }, axis: string) => {
  const field = SchemaAST.isObjects(schema.ast)
    ? schema.ast.propertySignatures.find((property) => property.name === axis)?.type
    : undefined;
  return field && Option.getOrUndefined(NumberLayoutAnnotation.getFromAst(field));
};

describe('node fields', () => {
  test("a node's centre and size axes align their figures to the end and show steppers on hover, as 3D does", () => {
    expect(axisLayout(nodeBase.center, 'x')).toEqual(VECTOR_AXIS_LAYOUT);
    expect(axisLayout(nodeBase.center, 'y')).toEqual(VECTOR_AXIS_LAYOUT);
    expect(axisLayout(nodeBase.size, 'width')).toEqual(VECTOR_AXIS_LAYOUT);
    expect(axisLayout(nodeBase.size, 'height')).toEqual(VECTOR_AXIS_LAYOUT);
  });
});
