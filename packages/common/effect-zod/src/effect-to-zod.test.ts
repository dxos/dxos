//
// Copyright 2026 DXOS.org
//

// Verifies the Effect Schema → Zod converter produces zod schemas equivalent
// to the ones we'd write by hand. The MCP SDK doesn't care HOW the zod schema
// was built, only that it parses correctly — so each test asserts
// parse-equivalence with a hand-written zod schema for the same shape.

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';
import { z } from 'zod';

import { effectFieldsToZod } from './effect-to-zod';

describe('effectFieldsToZod', () => {
  test('Schema.String required → z.string()', ({ expect }) => {
    const out = effectFieldsToZod(
      Schema.Struct({
        name: Schema.String.annotations({ description: 'a name' }),
      }),
    );
    expect(out.name.parse('hello')).toBe('hello');
    expect(() => out.name.parse(undefined)).toThrow();
    expect(out.name.description).toBe('a name');
  });

  test('Schema.optional(Schema.String) → z.string().optional()', ({ expect }) => {
    const out = effectFieldsToZod(
      Schema.Struct({
        nick: Schema.optional(Schema.String).annotations({ description: 'nick' }),
      }),
    );
    expect(out.nick.parse('hi')).toBe('hi');
    expect(out.nick.parse(undefined)).toBe(undefined);
    expect(out.nick.description).toBe('nick');
  });

  test('Schema.Boolean → z.boolean()', ({ expect }) => {
    const out = effectFieldsToZod(Schema.Struct({ enabled: Schema.Boolean }));
    expect(out.enabled.parse(true)).toBe(true);
    expect(() => out.enabled.parse('true')).toThrow();
  });

  test('Schema.Number with int/positive/lessThanOrEqualTo refinements → z.number().int().positive().max(N)', ({
    expect,
  }) => {
    const out = effectFieldsToZod(
      Schema.Struct({
        limit: Schema.optional(
          Schema.Number.pipe(Schema.int(), Schema.positive(), Schema.lessThanOrEqualTo(200)),
        ).annotations({ description: 'limit' }),
      }),
    );
    expect(out.limit.parse(50)).toBe(50);
    expect(out.limit.parse(undefined)).toBe(undefined);
    expect(() => out.limit.parse(0)).toThrow(); // not positive
    expect(() => out.limit.parse(1.5)).toThrow(); // not int
    expect(() => out.limit.parse(201)).toThrow(); // exceeds max
    expect(() => out.limit.parse(-1)).toThrow(); // not positive
  });

  test('Schema.Literal(...) string union → z.enum([...])', ({ expect }) => {
    const out = effectFieldsToZod(
      Schema.Struct({
        kind: Schema.Literal('function', 'class', 'interface'),
      }),
    );
    expect(out.kind.parse('function')).toBe('function');
    expect(() => out.kind.parse('module')).toThrow();
  });

  test('Schema.Array(Schema.String) → z.array(z.string())', ({ expect }) => {
    const out = effectFieldsToZod(
      Schema.Struct({
        tags: Schema.Array(Schema.String),
      }),
    );
    expect(out.tags.parse(['a', 'b'])).toEqual(['a', 'b']);
    expect(() => out.tags.parse([1, 2])).toThrow();
  });

  test('Schema.Array(Schema.Literal(...)) → z.array(z.enum([...]))', ({ expect }) => {
    const out = effectFieldsToZod(
      Schema.Struct({
        include: Schema.optional(Schema.Array(Schema.Literal('source', 'jsdoc'))),
      }),
    );
    expect(out.include.parse(['source'])).toEqual(['source']);
    expect(out.include.parse(undefined)).toBe(undefined);
    expect(() => out.include.parse(['random'])).toThrow();
  });

  test('description on optional wrapper survives the conversion', ({ expect }) => {
    // The user-facing pattern: `.annotations({ description })` is added at the
    // wrapper level (on `Schema.optional(...)`). The converter must read it
    // from the PropertySignatureDeclaration's annotations.
    const out = effectFieldsToZod(
      Schema.Struct({
        x: Schema.optional(Schema.String).annotations({ description: 'X-axis' }),
      }),
    );
    expect(out.x.description).toBe('X-axis');
  });

  test('multiple fields convert independently', ({ expect }) => {
    const out = effectFieldsToZod(
      Schema.Struct({
        name: Schema.optional(Schema.String).annotations({ description: 'pkg name' }),
        privateOnly: Schema.optional(Schema.Boolean).annotations({ description: 'private?' }),
        limit: Schema.optional(
          Schema.Number.pipe(Schema.int(), Schema.positive(), Schema.lessThanOrEqualTo(200)),
        ).annotations({ description: 'cap' }),
      }),
    );
    // Spread into z.object to validate as a unit (which is how the MCP SDK
    // consumes this record).
    const combined = z.object(out);
    expect(combined.parse({ name: 'foo', privateOnly: true, limit: 10 })).toEqual({
      name: 'foo',
      privateOnly: true,
      limit: 10,
    });
    expect(combined.parse({})).toEqual({});
  });

  test('unsupported AST nodes throw with a clear message', ({ expect }) => {
    // Schema.Class, Schema.Tuple (fixed elements), Date, transformations etc.
    // aren't currently used in our tool inputs and aren't supported. Strict
    // denylist beats silent miscompilation.
    expect(() =>
      effectFieldsToZod(
        Schema.Struct({
          // Schema.Date is built on a transformation we don't unwrap.
          when: Schema.Date,
        }),
      ),
    ).toThrow(/failed to convert field "when"/);
  });
});
