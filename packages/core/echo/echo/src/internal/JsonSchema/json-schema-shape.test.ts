//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { DXN } from '@dxos/keys';

import * as Format from '../../Format.ts';
import * as Type from '../../Type.ts';
import { toJsonSchema } from './json-schema.ts';

//
// `toJsonSchema` output is a wire contract, not an internal detail. It is handed to language
// models as tool-parameter and schema-inspection payloads, and consumers read it structurally at
// the TOP LEVEL of each property:
//
//   - `assistant-toolkit/src/skills/database/operations/schema-list.ts` returns it to the model;
//   - `schema-add.ts` accepts the same shape back FROM the model;
//   - in dxos/edge, `ai-service/src/generation/tools/types.ts` reads
//     `jsonSchema.properties[key].description` and throws when it is not a string.
//
// Effect 4's own emitter nests annotations under `allOf` and widens optional fields to
// `anyOf: [T, null]`, which breaks every one of those readers. These tests pin the shape so that
// a change to the emitter is a deliberate, visible decision rather than a silent regression.
//

describe('toJsonSchema wire shape', () => {
  const Contact = Type.makeObject(DXN.make('com.example.type.Contact', '0.1.0'))(
    Schema.Struct({
      name: Schema.String.annotate({ title: 'Full name', description: 'The contact name' }),
      email: Schema.optional(Format.Email),
      age: Schema.optional(
        Schema.Number.pipe(Schema.check(Schema.isInt()), Schema.check(Schema.isBetween({ minimum: 0, maximum: 150 }))),
      ),
      active: Schema.Boolean,
      kind: Schema.Literals(['personal', 'work']),
    }),
  );

  test('constraints and annotations stay at the top level of a property', () => {
    const { properties } = toJsonSchema(Contact);

    // Refinements are inlined, NOT nested under `allOf`.
    expect(properties!.age).toMatchObject({ type: 'integer', minimum: 0, maximum: 150 });
    expect(properties!.age).not.toHaveProperty('allOf');

    // Format annotations are readable without descending into a wrapper.
    expect(properties!.email).toMatchObject({ type: 'string', format: 'email' });
    expect(properties!.email).not.toHaveProperty('allOf');
    expect(typeof properties!.email.description).toBe('string');

    expect(properties!.name).toMatchObject({
      type: 'string',
      title: 'Full name',
      description: 'The contact name',
    });
  });

  test('optional fields are the bare type, omitted from `required`', () => {
    const jsonSchema = toJsonSchema(Contact);

    // NOT `anyOf: [T, {type: 'null'}]` — optionality is carried by `required` alone.
    expect(jsonSchema.properties!.email).not.toHaveProperty('anyOf');
    expect(jsonSchema.properties!.age).not.toHaveProperty('anyOf');
    expect(jsonSchema.required).toEqual(expect.arrayContaining(['name', 'active', 'kind']));
    expect(jsonSchema.required).not.toEqual(expect.arrayContaining(['email', 'age']));
  });

  test('literal unions are a flat string enum', () => {
    const { properties } = toJsonSchema(Contact);
    expect(properties!.kind).toMatchObject({ type: 'string', enum: ['personal', 'work'] });
  });

  test('the document is a flat object, not a $ref into a definitions map', () => {
    const jsonSchema = toJsonSchema(Contact);
    expect(jsonSchema.type).toBe('object');
    expect(jsonSchema).not.toHaveProperty('$ref');
    expect(jsonSchema).not.toHaveProperty('definitions');
    expect(jsonSchema.$id).toBe('dxn:com.example.type.Contact:0.1.0');
    expect(jsonSchema.typename).toBe('com.example.type.Contact');
  });

  test('every property carries a top-level description when one is declared', () => {
    // Mirrors the assertion in edge's `toFunctionParameterSchema`, which throws otherwise.
    const Described = Type.makeObject(DXN.make('com.example.type.Described', '0.1.0'))(
      Schema.Struct({
        plain: Schema.String.annotate({ description: 'A plain string' }),
        refined: Schema.String.pipe(Schema.check(Schema.isNonEmpty())).annotate({ description: 'A refined string' }),
        numeric: Schema.Number.pipe(Schema.check(Schema.isInt())).annotate({ description: 'A refined number' }),
      }),
    );

    const { properties } = toJsonSchema(Described);
    for (const key of ['plain', 'refined', 'numeric']) {
      expect(typeof properties![key].description, key).toBe('string');
    }
  });
});
