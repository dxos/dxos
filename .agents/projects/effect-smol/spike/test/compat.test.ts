import * as Schema from 'effect/Schema';
import * as SchemaAST from 'effect/SchemaAST';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

import * as Ast from '../src/ast';
import { EchoAnnotationKeys, toEffectSchema } from '../src/json-schema-compat';

const fixtures = JSON.parse(
  readFileSync(fileURLToPath(new URL('../fixtures-v3.json', import.meta.url)), 'utf-8'),
) as Record<string, any>;

describe('v3-persisted JSON Schema -> v4 Schema', () => {
  test('reconstructs the ECHO type identity', () => {
    const schema = toEffectSchema(fixtures.Person);
    const annotations = schema.ast.annotations!;
    expect(annotations[EchoAnnotationKeys.type]).toEqual({
      typename: 'com.example.type.Person',
      version: '0.1.0',
      kind: 'object',
    });
    expect(annotations[EchoAnnotationKeys.typeIdentifier]).toEqual('dxn:com.example.type.Person:0.1.0');
  });

  test('reconstructs every property with correct optionality', () => {
    const schema = toEffectSchema(fixtures.Person);
    const props = Ast.getProperties(schema.ast);
    const byName = Object.fromEntries(props.map((p) => [String(p.name), p]));

    expect(Object.keys(byName).sort()).toEqual(
      ['active', 'address', 'age', 'email', 'employer', 'id', 'kind', 'metadata', 'name', 'note', 'tags'].sort(),
    );

    // Required in the v3 document.
    for (const key of ['name', 'active', 'tags', 'kind', 'id']) {
      expect(byName[key].isOptional, `${key} should be required`).toBe(false);
    }
    // Optional in the v3 document.
    for (const key of ['email', 'age', 'address', 'metadata', 'note', 'employer']) {
      expect(byName[key].isOptional, `${key} should be optional`).toBe(true);
    }
  });

  test('preserves property order (DXOS extension)', () => {
    const schema = toEffectSchema(fixtures.Person);
    const names = Ast.getProperties(schema.ast).map((p) => String(p.name));
    expect(names).toEqual(fixtures.Person.propertyOrder);
  });

  test('decodes v3 sentinels that v4 never emits', () => {
    const schema = toEffectSchema(fixtures.Person);
    const byName = Object.fromEntries(Ast.getProperties(schema.ast).map((p) => [String(p.name), p]));

    // `{"$id": "/schemas/unknown"}` -> Unknown, not a degraded `{}`.
    expect(byName.note.type._tag).toBe('Unknown');
    // `additionalProperties: {"$id": "/schemas/any"}` -> a Record of Any.
    expect(byName.metadata.type._tag).toBe('Objects');
  });

  test('decodes the ECHO ref declaration and keeps the target DXN', () => {
    // `employer` is optional in Person, so read it off the un-normalised document.
    const employer = fixtures.Person.properties.employer;
    const schema = toEffectSchema(employer);
    expect(schema.ast._tag).toBe('Declaration');
    expect(schema.ast.annotations![EchoAnnotationKeys.reference]).toEqual({
      schema: { $ref: 'dxn:com.example.type.Org' },
      schemaVersion: '0.1.0',
    });
  });

  test('refinements become v4 checks and still validate', () => {
    const schema = toEffectSchema(fixtures.Person.properties.age);
    // v3 wrote `type: integer, minimum: 0, maximum: 150`; v4 carries these as Checks.
    expect(schema.ast.checks?.length).toBeGreaterThan(0);
    expect(Schema.is(schema as any)(42)).toBe(true);
    expect(Schema.is(schema as any)(-1)).toBe(false);
    expect(Schema.is(schema as any)(200)).toBe(false);
    expect(Schema.is(schema as any)(4.5)).toBe(false);
  });

  test('string pattern (email format) survives', () => {
    const schema = toEffectSchema(fixtures.Person.properties.email);
    expect(Schema.is(schema as any)('a@b.com')).toBe(true);
    expect(Schema.is(schema as any)('not-an-email')).toBe(false);
    // Annotations land on the trailing check in v4, so they must be read through the resolver.
    expect(Ast.resolveAnnotations(schema.ast)!.format).toBe('email');
    expect(Ast.resolveAnnotations(schema.ast)!.title).toBe('Email');
  });

  test('title/description annotations survive', () => {
    const schema = toEffectSchema(fixtures.Person.properties.name);
    expect(schema.ast.annotations!.title).toBe('Full name');
    expect(schema.ast.annotations!.description).toBe('The person name');
  });

  test('end-to-end: a real object validates against the reconstructed schema', () => {
    const schema = toEffectSchema(fixtures.Person);
    const valid = {
      id: '01JQ0000000000000000000000',
      name: 'Alice',
      active: true,
      tags: ['a', 'b'],
      kind: 'employee',
      email: 'alice@example.com',
      age: 33,
      address: { street: '1 Main St', city: 'Springfield' },
      metadata: { source: 'import' },
    };
    expect(Schema.is(schema as any)(valid)).toBe(true);

    expect(Schema.is(schema as any)({ ...valid, kind: 'intern' })).toBe(false);
    expect(Schema.is(schema as any)({ ...valid, age: 999 })).toBe(false);
    const { name: _dropped, ...missingRequired } = valid;
    expect(Schema.is(schema as any)(missingRequired)).toBe(false);
  });

  test('Org fixture round-trips too', () => {
    const schema = toEffectSchema(fixtures.Org);
    const props = Ast.getProperties(schema.ast);
    expect(props.map((p) => String(p.name)).sort()).toEqual(['id', 'name', 'website']);
    expect(Schema.is(schema as any)({ id: 'x', name: 'DXOS', website: 'https://dxos.org' })).toBe(true);
  });
});

describe('ast.ts port', () => {
  const Nested = Schema.Struct({ street: Schema.String, zip: Schema.optional(Schema.String) });
  const Sample = Schema.Struct({
    name: Schema.String.annotate({ title: 'Full name' }),
    age: Schema.optional(Schema.Number.check(Schema.isInt())),
    tags: Schema.mutable(Schema.Array(Schema.String)),
    kind: Schema.Literals(['a', 'b']),
    address: Nested,
  });

  test('getProperties reports names, optionality and readonly-ness', () => {
    const props = Ast.getProperties(Sample.ast);
    expect(props.map((p) => [String(p.name), p.isOptional])).toEqual([
      ['name', false],
      ['age', true],
      ['tags', false],
      ['kind', false],
      ['address', false],
    ]);
  });

  test('getProperties surfaces annotations from the base type', () => {
    const props = Ast.getProperties(Sample.ast);
    expect(props[0].type.annotations!.title).toBe('Full name');
  });

  test('isOption / unwrapOptional', () => {
    const age = Ast.getPropertySignatures(Sample.ast).find((p) => p.name === 'age')!;
    expect(Ast.isOption(age.type)).toBe(true);
    expect(Ast.unwrapOptional(age.type)._tag).toBe('Number');
  });

  test('isLiteralUnion / getLiteralValues', () => {
    expect(Ast.isLiteralUnion(Schema.Literals(['a', 'b']).ast)).toBe(true);
    expect(Ast.getLiteralValues(Schema.Literals(['a', 'b']))).toEqual(['a', 'b']);
    expect(Ast.isLiteralUnion(Schema.String.ast)).toBe(false);
  });

  test('isArrayType / getArrayElementType', () => {
    const tags = Ast.getPropertySignatures(Sample.ast).find((p) => p.name === 'tags')!;
    expect(Ast.isArrayType(tags.type)).toBe(true);
    expect(Ast.getArrayElementType(tags.type)!._tag).toBe('String');
  });

  test('visit walks the whole tree with paths', () => {
    const seen: string[] = [];
    Ast.visit(
      Sample.ast,
      () => true,
      (node, path) => seen.push(`${path.join('.')}:${node._tag}`),
    );
    expect(seen).toContain('name:String');
    expect(seen).toContain('address:Objects');
    expect(seen).toContain('address.street:String');
  });

  test('findNode descends into nested objects', () => {
    const found = Ast.findNode(Sample.ast, (node) => node.annotations?.title === 'Full name');
    expect(found?._tag).toBe('String');
  });

  test('findProperty resolves dot-paths', () => {
    expect(Ast.findProperty(Sample, 'address.street')?._tag).toBe('String');
    expect(Ast.findProperty(Sample, 'address.nope')).toBeUndefined();
  });

  test('discriminated unions', () => {
    const Union = Schema.Union([
      Schema.Struct({ kind: Schema.Literal('circle'), r: Schema.Number }),
      Schema.Struct({ kind: Schema.Literal('square'), side: Schema.Number }),
    ]);
    expect(Ast.isDiscriminatedUnion(Union.ast)).toBe(true);
    expect(Ast.getDiscriminatingProps(Union.ast)).toEqual(['kind']);
    const picked = Ast.getDiscriminatedType(Union.ast, { kind: 'square' });
    expect(Ast.getProperties(picked!).map((p) => String(p.name))).toEqual(['kind', 'side']);
  });

  test('mapAst rebuilds a tree and preserves optionality', () => {
    const upper = (node: SchemaAST.AST): SchemaAST.AST =>
      node._tag === 'String' ? Ast.annotateAst(node, { title: 'MAPPED' }) : Ast.mapAst(node, upper);
    const mapped = Ast.mapAst(Sample.ast, upper);
    const props = Ast.getProperties(mapped);
    const byName = Object.fromEntries(props.map((p) => [String(p.name), p]));
    expect(byName.name.type.annotations!.title).toBe('MAPPED');
    // Regression guard: context (optionality) must survive the rebuild.
    expect(byName.age.isOptional).toBe(true);
  });
});
