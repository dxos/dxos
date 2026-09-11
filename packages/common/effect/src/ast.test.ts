//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { invariant } from '@dxos/invariant';

import {
  findAnnotation,
  findNode,
  findProperty,
  getAnnotation,
  getDiscriminatedType,
  getDiscriminatingProps,
  getProperties,
  isArrayType,
  isDiscriminatedUnion,
  isOption,
  mapAst,
  retainContext,
  visit,
} from './internal/ast.ts';
import { type JsonPath, type JsonProp } from './internal/json-path.ts';
import * as SchemaAST from './internal/schema-ast.ts';

const ZipCode = Schema.String.pipe(
  Schema.check(
    Schema.isPattern(/^\d{5}$/, {
      identifier: 'ZipCode',
      title: 'ZIP code',
      description: 'Simple 5 digit zip code',
    }),
  ),
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
    const validate = Schema.decodeUnknownSync(ZipCode);
    validate('11205');

    expect(() => validate(null)).to.throw();
    expect(() => validate(12345)).to.throw();
    expect(() => validate('')).to.throw();
    expect(() => validate('1234')).to.throw();
  });

  test('findNode', ({ expect }) => {
    const TestSchema = Schema.Struct({
      name: Schema.optional(Schema.String),
    });

    const prop = findProperty(TestSchema, 'name' as JsonProp);
    invariant(prop);
    const node = findNode(prop, (node) => node._tag === 'String');
    invariant(node);
    expect(node._tag).to.eq('String');
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

  test('getProperties preserves annotation on property type after refinements', ({ expect }) => {
    // When a property is e.g. Format.Text.pipe(nonEmptyString(), maxLength(), Schema.annotate({ title, description })),
    // the form uses getProperties(schema.ast) and then Format.FormatAnnotation.getFromAst(property.type).
    // Custom title and description from the outer Schema.annotate() must not be lost.
    const WithRefinements = Schema.Struct({
      message: Schema.String.annotate({ title: 'Feedback' }).pipe(
        Schema.check(Schema.isMinLength(1)),
        Schema.check(Schema.isMaxLength(4096)),
        Schema.annotate({
          title: 'Feedback label',
          description: 'Feedback placeholder',
        }),
      ),
    });
    const properties = getProperties(WithRefinements.ast);
    const messageProp = properties.find((p) => p.name === 'message');
    invariant(messageProp);
    const title = findAnnotation(messageProp.type, SchemaAST.TitleAnnotationId);
    const description = findAnnotation(messageProp.type, SchemaAST.DescriptionAnnotationId);
    // Outer Schema.annotate() wins so form labels/placeholders are preserved.
    expect(title).to.eq('Feedback label');
    expect(description).to.eq('Feedback placeholder');
  });

  test('findAnnotation', ({ expect }) => {
    const TestSchema = Schema.NonEmptyString.pipe(Schema.check(Schema.isPattern(/^\d{5}$/))).annotate({
      title: 'original title',
    });

    const ContactSchema = Schema.Struct({
      p1: TestSchema.annotate({ title: 'new title' }),
      p2: TestSchema.annotate({ title: 'new title' }).pipe(Schema.optional),
      p3: Schema.optional(TestSchema.annotate({ title: 'new title' })),
    });

    for (const p of ['p1', 'p2', 'p3']) {
      const prop = findProperty(ContactSchema, p as JsonPath);
      invariant(prop);
      const value = findAnnotation(prop, SchemaAST.TitleAnnotationId);
      expect(value, `invalid title for ${p}`).to.eq('new title');
    }
  });

  test('findAnnotation skips defaults', ({ expect }) => {
    const annotation = findAnnotation(Schema.String.annotate({ title: 'test' }).ast, SchemaAST.TitleAnnotationId);
    expect(annotation).to.eq('test');

    const annotationIds = [SchemaAST.TitleAnnotationId, SchemaAST.DescriptionAnnotationId];
    const schemas = [Schema.ObjectKeyword, Schema.String, Schema.Number, Schema.Boolean];
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
    visit(
      TestSchema.ast,
      (_, path) => props.push(path.join('.')),
      (node, path, depth) => depth < 3,
    );
  });

  test('discriminated unions', ({ expect }) => {
    const TestUnionSchema = Schema.Union([
      Schema.Struct({ kind: Schema.Literal('a'), label: Schema.String }),
      Schema.Struct({ kind: Schema.Literal('b'), count: Schema.Number, active: Schema.Boolean }),
    ]);

    type TestUnionType = Schema.Schema.Type<typeof TestUnionSchema>;

    {
      expect(isOption(TestUnionSchema.ast)).to.be.false;
      expect(getDiscriminatingProps(TestUnionSchema.ast)).to.deep.eq(['kind']);

      const node = findNode(TestUnionSchema.ast, isDiscriminatedUnion);
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

      const names = (ast: SchemaAST.AST | undefined) =>
        SchemaAST.getPropertySignatures(ast!).map((prop) => String(prop.name));

      expect(names(getDiscriminatedType(TestUnionSchema.ast, obj1))).to.deep.eq(names(a));
      expect(names(getDiscriminatedType(TestUnionSchema.ast, obj2))).to.deep.eq(names(b));
      // With no value to discriminate on, only the discriminating property survives.
      expect(names(getDiscriminatedType(TestUnionSchema.ast))).to.deep.eq(['kind']);
    }
  });

  test('field lookup', ({ expect }) => {
    // v4 removed Schema.pluck/typeSchema; the property AST is read directly instead.
    const TestSchema = Schema.Struct({
      name: Schema.String,
    });

    expect(findProperty(TestSchema, 'name' as JsonProp)?._tag).to.eq('String');
    expect(findProperty(TestSchema, 'missing' as JsonProp)).to.be.undefined;
  });

  test('isArray', ({ expect }) => {
    expect(isArrayType(Schema.String.ast)).to.be.false;
    expect(isArrayType(Schema.Array(Schema.String).ast)).to.be.true;
    expect(isArrayType(findProperty(Schema.Struct({ a: Schema.Array(Schema.String) }), 'a' as JsonPath)!)).to.be.true;
    expect(isArrayType(Schema.Union([Schema.String, Schema.Array(Schema.String)]).ast)).to.be.false;
  });
});

// Optionality and mutability ride on a node's `context` in v4, so any mapper that rebuilds a node
// must carry it across. Losing it turns an optional key into a required one, which surfaces far from
// the cause — a caller (or an LLM tool call) that legitimately omits the key fails with `Missing key`.
describe('mapAst', () => {
  /** Replaces every string leaf with a fresh node that carries no context, forcing ancestor rebuilds. */
  const replaceStrings = (ast: SchemaAST.AST): SchemaAST.AST =>
    SchemaAST.isStringKeyword(ast) ? Schema.Number.ast : mapAst(ast, (child) => replaceStrings(child));

  // `JsonSchema` is an open record, so `required` arrives as `unknown`.
  const requiredKeys = (schema: Schema.Top): readonly string[] => {
    const { required } = Schema.toJsonSchemaDocument(schema).schema;
    return Array.isArray(required) ? required.map(String) : [];
  };

  const remap = (schema: Schema.Top): Schema.Top => Schema.make<Schema.Top>(replaceStrings(schema.ast));

  test('a rewritten property keeps `optional`', ({ expect }) => {
    const remapped = remap(Schema.Struct({ a: Schema.optional(Schema.String), b: Schema.String }));
    expect(requiredKeys(remapped)).to.deep.eq(['b']);
  });

  test('a rewritten property keeps `optionalKey`', ({ expect }) => {
    // `optionalKey` puts the modifier on the value node itself, so a wholesale replacement of that
    // node drops it unless the rebuild restores it.
    const remapped = remap(Schema.Struct({ a: Schema.optionalKey(Schema.String), b: Schema.String }));
    expect(requiredKeys(remapped)).to.deep.eq(['b']);
  });

  test('a rewritten property keeps `mutableKey`', ({ expect }) => {
    const remapped = remap(Schema.Struct({ a: Schema.mutableKey(Schema.String) }));
    const prop = SchemaAST.getPropertySignatures(remapped.ast).find((property) => property.name === 'a');
    invariant(prop);
    expect(SchemaAST.isMutable(prop.type)).to.be.true;
  });

  test('optionality survives a rewrite nested in an array and a union', ({ expect }) => {
    const remapped = remap(
      Schema.Struct({
        list: Schema.optional(Schema.Array(Schema.String)),
        either: Schema.optional(Schema.Union([Schema.String, Schema.Boolean])),
        required: Schema.Boolean,
      }),
    );
    expect(requiredKeys(remapped)).to.deep.eq(['required']);
  });

  test('retainContext carries optionality onto a replacement node', ({ expect }) => {
    const original = Schema.optionalKey(Schema.String).ast;
    expect(SchemaAST.isOptional(retainContext(original, Schema.Number.ast))).to.be.true;
    // A replacement that already carries its own context is left alone.
    expect(SchemaAST.isOptional(retainContext(Schema.String.ast, Schema.Number.ast))).to.be.false;
  });
});
