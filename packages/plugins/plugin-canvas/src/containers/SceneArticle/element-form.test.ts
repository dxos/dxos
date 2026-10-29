//
// Copyright 2026 DXOS.org
//

import * as SchemaAST from 'effect/SchemaAST';
import { describe, expect, test } from 'vitest';

import { type Scene } from '@dxos/scene';

import { ElementForm, elementFormIntents, elementFormValues } from './element-form.ts';

const cube: Scene.Element3D = { id: 'box', kind: 'cube', label: 'Cube' };

/** Whether the struct `ast` marks `name` optional. */
const optional = (ast: SchemaAST.AST, name: string) =>
  SchemaAST.isObjects(ast) && ast.propertySignatures.find((field) => field.name === name)?.type.context?.isOptional;

describe('element form', () => {
  test('a vector field marks none of its axes required', () => {
    const rotation = SchemaAST.isObjects(ElementForm.ast)
      ? ElementForm.ast.propertySignatures.find((field) => field.name === 'rotation')
      : undefined;
    const inner = rotation && SchemaAST.isUnion(rotation.type) ? rotation.type.types[0] : rotation?.type;
    for (const axis of ['x', 'y', 'z']) {
      expect(inner && optional(inner, axis)).toBe(true);
    }
  });

  test('an element with no transform shows the identity and saving it writes nothing', () => {
    const values = elementFormValues(cube);
    expect(values.rotation).toEqual({ x: 0, y: 0, z: 0 });
    expect(values.scale).toEqual({ x: 1, y: 1, z: 1 });
    expect(elementFormIntents(cube, values)).toEqual([]);
  });

  test('editing one axis writes the whole vector', () => {
    const values = elementFormValues(cube);
    expect(elementFormIntents(cube, { ...values, rotation: { x: 30 } })).toEqual([
      { kind: 'update', id: 'box', path: ['rotation'], value: { x: 30, y: 0, z: 0 } },
    ]);
  });
});
