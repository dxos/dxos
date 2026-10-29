//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import { describe, expect, test } from 'vitest';

import { Annotation } from '@dxos/echo';
import { Scene } from '@dxos/scene';

import { ElementForm } from './element-form.ts';

/** The form layout a struct schema declares, unwrapping an optional field's union. */
const layoutOf = (ast: SchemaAST.AST): string | undefined => {
  const struct = SchemaAST.isUnion(ast) ? ast.types.find((type) => !SchemaAST.isUndefined(type)) : ast;
  return (
    struct &&
    Option.getOrUndefined(Annotation.FormLayoutAnnotation.get(Schema.make(struct)))?.[Annotation.DEFAULT_LAYOUT_NAME]
  );
};

const field = (name: string) =>
  SchemaAST.isObjects(ElementForm.ast)
    ? ElementForm.ast.propertySignatures.find((p) => p.name === name)?.type
    : undefined;

describe('vector fields', () => {
  test('a 3D vector lays out X, Y and Z on one row', () => {
    expect(layoutOf(Scene.Vec3.ast)).toContain('cols="3"');
    for (const name of ['center', 'rotation', 'scale']) {
      const ast = field(name);
      expect(ast && layoutOf(ast)).toContain('cols="3"');
    }
  });

  test('a 2D vector lays out X and Y on one row', () => {
    expect(layoutOf(Scene.Vec2.ast)).toContain('cols="2"');
  });
});
