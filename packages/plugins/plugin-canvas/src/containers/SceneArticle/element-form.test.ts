//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as SchemaAST from 'effect/SchemaAST';
import { describe, expect, test } from 'vitest';

import { LayerField, StyleGridField, applyStyleChoice } from '@dxos/react-ui-canvas';
import { StepAnnotation } from '@dxos/react-ui-form';
import { type Scene } from '@dxos/scene';

import {
  ELEMENT_FORM_FIELDS,
  ELEMENT_FORM_OVERRIDES,
  ElementForm,
  elementFormIntents,
  elementFormValues,
} from './element-form.ts';

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

  test('steppers move a centre one ground-grid unit, a rotation 15 degrees and a scale a tenth', () => {
    const stepOf = (name: string) => {
      const field = SchemaAST.isObjects(ElementForm.ast)
        ? ElementForm.ast.propertySignatures.find((p) => p.name === name)?.type
        : undefined;
      const struct = field && SchemaAST.isUnion(field) ? field.types[0] : field;
      const axis = struct && SchemaAST.isObjects(struct) ? struct.propertySignatures[0].type : undefined;
      const inner = axis && SchemaAST.isUnion(axis) ? axis.types[0] : axis;
      return inner && Option.getOrUndefined(StepAnnotation.getFromAst(inner));
    };
    expect(stepOf('center')).toBe(1);
    expect(stepOf('rotation')).toBe(15);
    expect(stepOf('scale')).toBe(0.1);
  });

  test("the style fields are the 2D canvas's: its colour grid at style.hue, the tone without a field of its own", () => {
    expect(ELEMENT_FORM_FIELDS['style.hue']).toBe(StyleGridField);
    expect(ELEMENT_FORM_OVERRIDES['style.tone']).toMatchObject({ hidden: true });
  });

  test("a pick in the colour grid writes the element's hue and tone, keeping its surface", () => {
    const element: Scene.Element3D = { ...cube, style: { hue: 'blue', surface: 'glass' } };
    const values = elementFormValues(element);
    const style = applyStyleChoice(values.style ?? {}, { hue: 'red', tone: 1 }, true);
    expect(elementFormIntents(element, { ...values, style })).toEqual([
      { kind: 'update', id: 'box', path: ['style'], value: { hue: 'red', tone: 1, surface: 'glass' } },
    ]);
  });

  test('opacity steps by a tenth, as in 2D', () => {
    const style = SchemaAST.isObjects(ElementForm.ast)
      ? ElementForm.ast.propertySignatures.find((field) => field.name === 'style')?.type
      : undefined;
    const inner = style && SchemaAST.isUnion(style) ? style.types[0] : style;
    const opacity =
      inner && SchemaAST.isObjects(inner) ? inner.propertySignatures.find((f) => f.name === 'opacity') : undefined;
    const type = opacity && SchemaAST.isUnion(opacity.type) ? opacity.type.types[0] : opacity?.type;
    expect(type && Option.getOrUndefined(StepAnnotation.getFromAst(type))).toBe(0.1);
  });

  test("the layer is edited as in 2D: the form shows it and a change writes the element's layer", () => {
    expect(elementFormValues({ ...cube, layer: 'back' }).layer).toBe('back');
    const values = elementFormValues(cube);
    expect(elementFormIntents(cube, { ...values, layer: 'front' })).toEqual([
      { kind: 'update', id: 'box', path: ['layer'], value: 'front' },
    ]);
    expect(ELEMENT_FORM_FIELDS.layer).toBe(LayerField);
  });
});
