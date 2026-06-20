//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import { describe, test } from 'vitest';

import { DXN, Annotation, JsonSchema, Type } from '@dxos/echo';
import { Format } from '@dxos/echo/Format';
import { SchemaEx } from '@dxos/effect';

import { getFormProperties, getRootFormProperties } from './properties';

describe('getFormProperties', () => {
  test('filters out keyword fields annotated FormInputAnnotation.set(false)', ({ expect }) => {
    const TestSchema = Schema.Struct({
      name: Schema.optional(Schema.String),
      hidden: Schema.String.pipe(Annotation.FormInputAnnotation.set(false)),
    }).pipe(Type.makeObject(DXN.make('org.dxos.test.keywordHidden', '0.1.0')));

    const names = getFormProperties(Type.getSchema(TestSchema).ast).map((prop) => prop.name);
    expect(names).toContain('name');
    expect(names).not.toContain('hidden');
  });

  test('filters out struct fields annotated FormInputAnnotation.set(false)', ({ expect }) => {
    // Regression: JsonSchema fields are a Schema.Struct; encodedBoundAST strips
    // annotations from non-keyword inner types, which previously bypassed the
    // form-input filter (e.g., Routine.input).
    const TestSchema = Schema.Struct({
      name: Schema.optional(Schema.String),
      schema: JsonSchema.JsonSchema.pipe(Annotation.FormInputAnnotation.set(false)),
    }).pipe(Type.makeObject(DXN.make('org.dxos.test.structHidden', '0.1.0')));

    const names = getFormProperties(Type.getSchema(TestSchema).ast).map((prop) => prop.name);
    expect(names).toContain('name');
    expect(names).not.toContain('schema');
  });

  test('filters out array fields annotated FormInputAnnotation.set(false)', ({ expect }) => {
    const TestSchema = Schema.Struct({
      name: Schema.optional(Schema.String),
      context: Schema.Array(Schema.Any).pipe(Annotation.FormInputAnnotation.set(false)),
    }).pipe(Type.makeObject(DXN.make('org.dxos.test.arrayHidden', '0.1.0')));

    const names = getFormProperties(Type.getSchema(TestSchema).ast).map((prop) => prop.name);
    expect(names).toContain('name');
    expect(names).not.toContain('context');
  });

  test('filters out optional fields annotated FormInputAnnotation.set(false)', ({ expect }) => {
    // Regression: optional fields' `prop.type` is the union `T | undefined`; the
    // annotation lives on the inner `T`. Without unwrapping, the filter would
    // miss the annotation and the hidden field would render. Covers the
    // conventional pattern `Schema.X.pipe(FormInputAnnotation.set(false), Schema.optional)`.
    const TestSchema = Schema.Struct({
      name: Schema.optional(Schema.String),
      userId: Schema.String.pipe(Annotation.FormInputAnnotation.set(false), Schema.optional),
    }).pipe(Type.makeObject(DXN.make('org.dxos.test.optionalHidden', '0.1.0')));

    const names = getFormProperties(Type.getSchema(TestSchema).ast).map((prop) => prop.name);
    expect(names).toContain('name');
    expect(names).not.toContain('userId');
  });

  test('preserves a deeply-nested FormInputAnnotation through unions and arrays', ({ expect }) => {
    // Regression: a hidden field nested below a discriminated union and arrays of structs (e.g.
    // Segment.details(road).routes[].legs[].geometry). `encodedBoundAST` strips annotations from
    // non-keyword inner types, so without keeping container types raw the annotation is lost by
    // the time the form recurses to the leaf field. The transformation element (GeoPoint) is the
    // trigger that forces the encode rebuild.
    const Leg = Schema.Struct({
      distance: Schema.Number,
      geometry: Schema.Array(Format.GeoPoint).pipe(Annotation.FormInputAnnotation.set(false)),
    });
    const Route = Schema.Struct({ legs: Schema.Array(Leg) });
    const TestSchema = Schema.Struct({
      details: Schema.Union(
        Schema.TaggedStruct('road', { routes: Schema.optional(Schema.Array(Route)) }),
        Schema.TaggedStruct('other', { note: Schema.optional(Schema.String) }),
      ),
    }).pipe(Type.makeObject(DXN.make('org.dxos.test.nestedHidden', '0.1.0')));

    // Drill as the form does: getFormProperties at each level, descending via the property type
    // (array element / type literal) returned by the previous level.
    const findTypeLiteralWith = (ast: SchemaAST.AST, prop: string) =>
      SchemaEx.findNode(
        ast,
        (node) => SchemaAST.isTypeLiteral(node) && SchemaAST.getPropertySignatures(node).some((p) => p.name === prop),
      )!;
    const propType = (ast: SchemaAST.AST, name: string) => getFormProperties(ast).find((p) => p.name === name)!.type;

    const detailsType = propType(Type.getSchema(TestSchema).ast, 'details');
    const roadTypeLiteral = findTypeLiteralWith(detailsType, 'routes');
    const routeTypeLiteral = SchemaEx.findNode(
      SchemaEx.getArrayElementType(propType(roadTypeLiteral, 'routes'))!,
      SchemaAST.isTypeLiteral,
    )!;
    const legTypeLiteral = SchemaEx.findNode(
      SchemaEx.getArrayElementType(propType(routeTypeLiteral, 'legs'))!,
      SchemaAST.isTypeLiteral,
    )!;

    const names = getFormProperties(legTypeLiteral).map((prop) => prop.name);
    expect(names).toContain('distance');
    expect(names).not.toContain('geometry');
  });

  test('preserves annotation when chained with .annotations()', ({ expect }) => {
    // Regression: `.pipe(FormInputAnnotation.set(false)).annotations({...})` must
    // not lose the form-input annotation.
    const TestSchema = Schema.Struct({
      name: Schema.optional(Schema.String),
      hidden: JsonSchema.JsonSchema.pipe(Annotation.FormInputAnnotation.set(false)).annotations({
        description: 'Hidden field',
      }),
    }).pipe(Type.makeObject(DXN.make('org.dxos.test.chainedHidden', '0.1.0')));

    const names = getFormProperties(Type.getSchema(TestSchema).ast).map((prop) => prop.name);
    expect(names).toContain('name');
    expect(names).not.toContain('hidden');
  });
});

describe('getRootFormProperties', () => {
  const Timer = Schema.Struct({ kind: Schema.Literal('timer'), cron: Schema.String });
  const Feed = Schema.Struct({ kind: Schema.Literal('feed'), feed: Schema.String });
  const Union = Schema.Union(Timer, Feed);

  test('renders a non-union root unchanged', ({ expect }) => {
    const ast = Schema.Struct({ a: Schema.String, b: Schema.Number }).ast;
    expect(getRootFormProperties(ast, {}).map((prop) => prop.name)).toEqual(['a', 'b']);
  });

  test('expands a top-level discriminated union to the active member by discriminator value', ({ expect }) => {
    // `getPropertySignatures` on the union alone yields only the common `kind`; the active member's
    // variant field (`cron`/`feed`) must also render.
    expect(getRootFormProperties(Union.ast, { kind: 'timer' }).map((prop) => prop.name)).toEqual(['kind', 'cron']);
    expect(getRootFormProperties(Union.ast, { kind: 'feed' }).map((prop) => prop.name)).toEqual(['kind', 'feed']);
  });

  test('keeps the discriminator field switchable (union-wide literals, not the matched single literal)', ({
    expect,
  }) => {
    const kind = getRootFormProperties(Union.ast, { kind: 'feed' }).find((prop) => prop.name === 'kind');
    expect(kind && SchemaEx.getLiteralValues(Schema.make(kind.type))).toEqual(['timer', 'feed']);
  });

  test('falls back to the discriminator alone when no value selects a member', ({ expect }) => {
    expect(getRootFormProperties(Union.ast, {}).map((prop) => prop.name)).toEqual(['kind']);
  });
});
