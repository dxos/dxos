//
// Copyright 2024 DXOS.org
//

import { AST, Schema as S } from '@effect/schema';
import { describe, test } from 'vitest';

import { invariant } from '@dxos/invariant';

import {
  findAnnotation,
  findNode,
  findProperty,
  getAnnotation,
  getDiscriminatingProps,
  getDiscriminatedType,
  getSimpleType,
  isOption,
  isSimpleType,
  visit,
  JsonPath,
  JsonProp,
} from './ast';
import { isNone, isSome } from 'effect/Option';

const ZipCode = S.String.pipe(
  S.pattern(/^\d{5}$/, {
    typeId: Symbol.for('@example/schema/ZipCode'),
    identifier: 'ZipCode',
    title: 'ZIP code',
    description: 'Simple 5 digit zip code',
  }),
);

const LatLng = S.Struct({
  lat: S.Number,
  lng: S.Number,
});

const Contact = S.Struct({
  name: S.String,
  address: S.Struct({
    zip: ZipCode,
    location: S.optional(LatLng),
  }),
});

const getTitle = getAnnotation(AST.TitleAnnotationId);

describe('AST', () => {
  test('validation', ({ expect }) => {
    const validate = S.validateSync(ZipCode);
    validate('11205');

    expect(() => validate(null)).to.throw();
    expect(() => validate(12345)).to.throw();
    expect(() => validate('')).to.throw();
    expect(() => validate('1234')).to.throw();
  });

  test('findNode', ({ expect }) => {
    const TestSchema = S.Struct({
      name: S.optional(S.String),
    }).pipe(S.mutable);

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
      expect(AST.isNumberKeyword(prop)).to.be.true;
    }
    {
      const prop = findProperty(Contact, 'address.city' as JsonPath);
      expect(prop).not.to.exist;
    }
  });

  test('findAnnotation', ({ expect }) => {
    const TestSchema = S.NonEmptyString.pipe(S.pattern(/^\d{5}$/)).annotations({
      [AST.TitleAnnotationId]: 'original title',
    });

    const ContactSchema = S.Struct({
      p1: TestSchema.annotations({ [AST.TitleAnnotationId]: 'new title' }),
      p2: TestSchema.annotations({ [AST.TitleAnnotationId]: 'new title' }).pipe(S.optional),
      p3: S.optional(TestSchema.annotations({ [AST.TitleAnnotationId]: 'new title' })),
    });

    for (const p of ['p1', 'p2', 'p3']) {
      const prop = findProperty(ContactSchema, p as JsonPath);
      invariant(prop);
      const value = findAnnotation(prop, AST.TitleAnnotationId);
      expect(value, `invalid title for ${p}`).to.eq('new title');
    }
  });

  test('findAnnotation skips defaults', ({ expect }) => {
    const annotation = findAnnotation(
      S.String.annotations({ [AST.TitleAnnotationId]: 'test' }).ast,
      AST.TitleAnnotationId,
    );
    expect(annotation).to.eq('test');

    const annotationIds = [AST.TitleAnnotationId, AST.DescriptionAnnotationId];
    const schemas = [S.Object, S.String, S.Number, S.Boolean];
    for (const schema of schemas) {
      for (const annotationId of annotationIds) {
        const annotation = findAnnotation(schema.ast, annotationId);
        expect(annotation, String(annotationId) + ':' + schema).to.eq(undefined);
      }
    }
  });

  test('visit', ({ expect }) => {
    const TestSchema = S.Struct({
      name: S.NonEmptyString,
      emails: S.optional(S.mutable(S.Array(S.String))),
      address: S.optional(
        S.Struct({
          zip: S.String,
        }),
      ),
    });

    const props: string[] = [];
    visit(TestSchema.ast, (_, path) => props.push(path.join('.')));
  });

  test('discriminated unions', ({ expect }) => {
    const TestUnionSchema = S.Union(
      S.Struct({ kind: S.Literal('a'), label: S.String }),
      S.Struct({ kind: S.Literal('b'), count: S.Number, active: S.Boolean }),
    );

    type TestUnionType = S.Schema.Type<typeof TestUnionSchema>;

    {
      expect(isOption(TestUnionSchema.ast)).to.be.false;
      expect(getDiscriminatingProps(TestUnionSchema.ast)).to.deep.eq(['kind']);

      const node = findNode(TestUnionSchema.ast, isSimpleType);
      expect(node).to.eq(TestUnionSchema.ast);
    }

    {
      invariant(AST.isUnion(TestUnionSchema.ast));
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
        S.Struct({
          kind: S.Literal('a', 'b'),
        }).ast.toJSON(),
      );
    }
  });

  // TODO(ZaymonFC): Update this when we settle on the right indexing syntax for arrays.
  test('json path validation', ({ expect }) => {
    const validatePath = S.validateOption(JsonPath);

    // Valid paths.
    expect(isSome(validatePath('foo'))).toBe(true);
    expect(isSome(validatePath('foo.bar'))).toBe(true);
    expect(isSome(validatePath('foo.bar.baz'))).toBe(true);
    expect(isSome(validatePath('foo.0.bar'))).toBe(true);
    expect(isSome(validatePath('_foo.$bar'))).toBe(true);

    // Invalid paths.
    expect(isNone(validatePath(''))).toBe(true);
    expect(isNone(validatePath('.'))).toBe(true);
    expect(isNone(validatePath('foo.'))).toBe(true);
    expect(isNone(validatePath('foo..bar'))).toBe(true);
    expect(isNone(validatePath('foo.#bar'))).toBe(true);
  });
});
