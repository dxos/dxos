//
// Copyright 2026 DXOS.org
//

import * as SchemaAST from 'effect/SchemaAST';
import { describe, expect, test } from 'vitest';

import { RectNode, Scene } from '@dxos/scene';
import { VectorAnnotationId } from '@dxos/ui-types';

import { ElementForm } from './element-form.ts';

/** Whether a struct schema is marked as a vector, unwrapping an optional field's union. */
const isVector = (ast: SchemaAST.AST): boolean => {
  const struct = SchemaAST.isUnion(ast) ? ast.types.find((type) => !SchemaAST.isUndefined(type)) : ast;
  return struct?.annotations?.[VectorAnnotationId] === true;
};

const field = (name: string) =>
  SchemaAST.isObjects(ElementForm.ast)
    ? ElementForm.ast.propertySignatures.find((p) => p.name === name)?.type
    : undefined;

describe('vector fields', () => {
  test('every 3D vector is a stacked vector field', () => {
    expect(isVector(Scene.Vec3.ast)).toBe(true);
    for (const name of ['center', 'rotation', 'scale']) {
      const ast = field(name);
      expect(ast && isVector(ast)).toBe(true);
    }
  });

  test('2D vectors and sizes are stacked vector fields', () => {
    expect(isVector(Scene.Vec2.ast)).toBe(true);
    expect(isVector(Scene.Size2.ast)).toBe(true);
    for (const name of ['center', 'size']) {
      const signature = SchemaAST.isObjects(Scene.Element2D.ast)
        ? Scene.Element2D.ast.propertySignatures.find((p) => p.name === name)?.type
        : undefined;
      expect(signature && isVector(signature)).toBe(true);
      const node = SchemaAST.isObjects(RectNode.ast)
        ? RectNode.ast.propertySignatures.find((p) => p.name === name)?.type
        : undefined;
      expect(node && isVector(node)).toBe(true);
    }
  });
});
