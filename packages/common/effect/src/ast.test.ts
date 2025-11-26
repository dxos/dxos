//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import { describe, test } from 'vitest';

import { invariant } from '@dxos/invariant';

import {
  findAnnotation,
  findNode,
  findProperty,
  getAnnotation,
  getDiscriminatedType,
  getDiscriminatingProps,
  getSimpleType,
  isArrayType,
  isOption,
  isSimpleType,
  visit,
} from './ast';
import { type JsonPath, type JsonProp } from './json-path';

const ZipCode = Schema.String.pipe(
  Schema.pattern(/^\d{5}$/, {
    typeId: Symbol.for('@example/schema/ZipCode'),
    identifier: 'ZipCode',
    title: 'ZIP code',
    description: 'Simple 5 digit zip code',
  }),
);

const LatLng = Schema.Struct({
  lat: Schema.Number,
  lng: Schema.Number,
});

const Contact = Schema.Struct({
  name: Schema.String,
  address: Schema.Struct({
    zip: ZipCode,
    location: Schema.optional(LatLng),
  }),
});

const getTitle = getAnnotation(SchemaAST.TitleAnnotationId);

describe('AST', () => {
  test('validation', ({ expect }) => {
    const validate = Schema.validateSync(ZipCode);
    validate('11205');

    expect(() => validate(null)).to.throw();
    expect(() => validate(12345)).to.throw();
    expect(() => validate('')).to.throw();
    expect(() => validate('1234')).to.throw();
  });

  test('findNode', ({ expect }) => {
    const TestSchema = Schema.Struct({
      name: Schema.optional(Schema.String),
    }).pipe(Schema.mutable);

    const prop = findProperty(TestSchema, 'name' as JsonProp);
    invariant(prop);
    const node = findNode(prop, isSimpleType);
    invariant(node);
    const type = getSimpleType(node);
    expect(type).to.eq('string');
  });

  test('findProperty', ({ expect }) => {
    {
      const prop = findProperty(Contact, 'name' as JsonPath);
      expect(prop).to.exist;
    }
    {
      const prop = findProperty(Contact, 'address.zip' as JsonPath);
      invariant(prop);
      expect(getTitle(prop)).to.eq('ZIP code');
    }
    {
      const prop = findProperty(Contact, 'address.location.lat' as JsonPath);
      invariant(prop);
      expect(SchemaAST.isNumberKeyword(prop)).to.be.true;
    }
    {
      const prop = findProperty(Contact, 'address.city' as JsonPath);
      expect(prop).not.to.exist;
    }
  });

  test('findAnnotation', ({ expect }) => {
    const TestSchema = Schema.NonEmptyString.pipe(Schema.pattern(/^\d{5}$/)).annotations({
      title: 'original title',
    });

    const ContactSchema = Schema.Struct({
      p1: TestSchema.annotations({ title: 'new title' }),
      p2: TestSchema.annotations({ title: 'new title' }).pipe(Schema.optional),
      p3: Schema.optional(TestSchema.annotations({ title: 'new title' })),
    });

    for (const p of ['p1', 'p2', 'p3']) {
      const prop = findProperty(ContactSchema, p as JsonPath);
      invariant(prop);
      const value = findAnnotation(prop, SchemaAST.TitleAnnotationId);
      expect(value, `invalid title for ${p}`).to.eq('new title');
    }
  });

  test('findAnnotation skips defaults', ({ expect }) => {
    const annotation = findAnnotation(Schema.String.annotations({ title: 'test' }).ast, SchemaAST.TitleAnnotationId);
    expect(annotation).to.eq('test');

    const annotationIds = [SchemaAST.TitleAnnotationId, SchemaAST.DescriptionAnnotationId];
    const schemas = [Schema.Object, Schema.String, Schema.Number, Schema.Boolean];
    for (const schema of schemas) {
      for (const annotationId of annotationIds) {
        const annotation = findAnnotation(schema.ast, annotationId);
        expect(annotation, String(annotationId) + ':' + schema).to.eq(undefined);
      }
    }
  });

  test('visit', ({ expect }) => {
    const TestSchema = Schema.Struct({
      name: Schema.NonEmptyString,
      emails: Schema.optional(Schema.mutable(Schema.Array(Schema.String))),
      address: Schema.optional(
        Schema.Struct({
          zip: Schema.String,
        }),
      ),
    });

    const props: string[] = [];
    visit(TestSchema.ast, (_, path) => props.push(path.join('.')));
  });

  test('discriminated unions', ({ expect }) => {
    const TestUnionSchema = Schema.Union(
      Schema.Struct({ kind: Schema.Literal('a'), label: Schema.String }),
      Schema.Struct({ kind: Schema.Literal('b'), count: Schema.Number, active: Schema.Boolean }),
    );

    type TestUnionType = Schema.Schema.Type<typeof TestUnionSchema>;

    {
      expect(isOption(TestUnionSchema.ast)).to.be.false;
      expect(getDiscriminatingProps(TestUnionSchema.ast)).to.deep.eq(['kind']);

      const node = findNode(TestUnionSchema.ast, isSimpleType);
      expect(node).to.eq(TestUnionSchema.ast);
    }

    {
      invariant(SchemaAST.isUnion(TestUnionSchema.ast));
      const [a, b] = TestUnionSchema.ast.types;

      const obj1: TestUnionType = {
        kind: 'a',
        label: 'test',
      };

      const obj2: TestUnionType = {
        kind: 'b',
        count: 100,
        active: true,
      };

      expect(getDiscriminatedType(TestUnionSchema.ast, obj1)?.toJSON()).to.deep.eq(a.toJSON());
      expect(getDiscriminatedType(TestUnionSchema.ast, obj2)?.toJSON()).to.deep.eq(b.toJSON());
      expect(getDiscriminatedType(TestUnionSchema.ast)?.toJSON()).to.deep.eq(
        Schema.Struct({
          kind: Schema.Literal('a', 'b'),
        }).ast.toJSON(),
      );
    }
  });

  test('Schema.pluck', ({ expect }) => {
    const TestSchema = Schema.Struct({
      name: Schema.String,
    });

    expect(TestSchema.pipe(Schema.pluck('name'), Schema.typeSchema).ast).toEqual(SchemaAST.stringKeyword);
    expect(() => TestSchema.pipe(Schema.pluck('missing' as any), Schema.typeSchema)).to.throw();
  });

  test('isArray', ({ expect }) => {
    expect(isArrayType(Schema.String.ast)).to.be.false;
    expect(isArrayType(Schema.Array(Schema.String).ast)).to.be.true;
    expect(isArrayType(findProperty(Schema.Struct({ a: Schema.Array(Schema.String) }), 'a' as JsonPath)!)).to.be.true;
    expect(isArrayType(Schema.Union(Schema.String, Schema.Array(Schema.String)).ast)).to.be.false;
  });
});
