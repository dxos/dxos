import * as Schema from 'effect/Schema';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

import * as Ast from '../src/ast';
import { isRepresentationDocument, readStoredSchema, writeStoredSchema } from '../src/dispatch';
import { EchoAnnotationKeys } from '../src/json-schema-compat';

const fixtures = JSON.parse(
  readFileSync(fileURLToPath(new URL('../fixtures-v3.json', import.meta.url)), 'utf-8'),
) as Record<string, any>;

describe('mixed-format space (one-directional compat)', () => {
  test('the two stored formats are distinguishable without a version field', () => {
    expect(isRepresentationDocument(fixtures.Person)).toBe(false);
    expect(isRepresentationDocument(writeStoredSchema(readStoredSchema(fixtures.Person)))).toBe(true);
  });

  test('a v4 client reads a v3-written document', () => {
    const schema = readStoredSchema(fixtures.Person);
    const names = Ast.getProperties(schema.ast).map((p) => String(p.name));
    expect(names).toEqual(fixtures.Person.propertyOrder);
  });

  test('a v4 client reads its own v4-written document', () => {
    const rewritten = writeStoredSchema(readStoredSchema(fixtures.Person));
    const schema = readStoredSchema(rewritten);
    const names = Ast.getProperties(schema.ast).map((p) => String(p.name));
    expect(names).toEqual(fixtures.Person.propertyOrder);
  });

  test('v3 -> v4 -> v4 rewrite is lossless for identity, optionality and validation', () => {
    const fromV3 = readStoredSchema(fixtures.Person);
    const roundTripped = readStoredSchema(writeStoredSchema(fromV3));

    const identity = (schema: Schema.Top) => (schema.ast as any).annotations?.[EchoAnnotationKeys.type];
    expect(identity(roundTripped)).toEqual(identity(fromV3));

    const optionality = (schema: Schema.Top) =>
      Ast.getProperties(schema.ast).map((p) => [String(p.name), p.isOptional]);
    expect(optionality(roundTripped)).toEqual(optionality(fromV3));

    const valid = {
      id: '01JQ0000000000000000000000',
      name: 'Alice',
      active: true,
      tags: ['a'],
      kind: 'employee',
      email: 'alice@example.com',
      age: 33,
    };
    expect(Schema.is(roundTripped as any)(valid)).toBe(true);
    expect(Schema.is(roundTripped as any)({ ...valid, age: 999 })).toBe(false);
    expect(Schema.is(roundTripped as any)({ ...valid, kind: 'intern' })).toBe(false);
    expect(Schema.is(roundTripped as any)({ ...valid, email: 'nope' })).toBe(false);
  });

  test('the ECHO ref survives the v3 -> v4 rewrite', () => {
    const roundTripped = readStoredSchema(writeStoredSchema(readStoredSchema(fixtures.Person)));
    const employer = Ast.getProperties(roundTripped.ast).find((p) => String(p.name) === 'employer')!;
    const inner = Ast.unwrapOptional(employer.type);
    expect(inner._tag).toBe('Declaration');
    expect((inner as any).annotations?.[EchoAnnotationKeys.reference]).toEqual({
      schema: { $ref: 'dxn:com.example.type.Org' },
      schemaVersion: '0.1.0',
    });
  });
});
