//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

import { SchemaAST } from '@dxos/effect';

import { TypeAnnotationId } from '../Annotation/annotations.ts';
import { type JsonSchemaType } from './json-schema-type.ts';
import { toEffectSchema } from './json-schema.ts';

//
// Spaces hold JSON Schema written by Effect 3, so `toEffectSchema` stays a permanent read path:
// it retires on space coverage, not on a release date. The fixture is every ECHO type exported by
// `@dxos/types` as `toJsonSchema` emitted it on effect 3.21.4, and it cannot be regenerated —
// v4 emits none of the `/schemas/*` sentinels below, so they survive only in already-stored data.
//

// Read rather than imported: `include: ['src']` does not pick up `.json`, so importing it would
// need the generated tsconfigs to carry an extra entry.
const types = JSON.parse(
  readFileSync(fileURLToPath(new URL('./json-schema-v3-corpus.json', import.meta.url)), 'utf-8'),
) as Record<string, JsonSchemaType>;
const typenames = Object.keys(types);

const propertiesOf = (schema: Schema.Codec<any, any>): readonly SchemaAST.PropertySignature[] => {
  const ast = SchemaAST.toType(schema.ast);
  expect(SchemaAST.isObjects(ast)).toBe(true);
  return SchemaAST.getPropertySignatures(ast);
};

describe('v3-persisted JSON Schema', () => {
  test('the fixture is the real production type set', ({ expect }) => {
    expect(typenames.length).toBeGreaterThanOrEqual(18);
    expect(typenames).toContain('org.dxos.type.person');
  });

  describe.each(typenames)('%s', (typename) => {
    const document = types[typename];

    test('decodes to an object schema', ({ expect }) => {
      expect(SchemaAST.isObjects(SchemaAST.toType(toEffectSchema(document).ast))).toBe(true);
    });

    test('preserves the declared properties and their optionality', ({ expect }) => {
      const declared = Object.keys((document as any).properties ?? {});
      const required: string[] = (document as any).required ?? [];
      const properties = propertiesOf(toEffectSchema(document));

      expect(properties.map((property) => String(property.name)).sort()).toEqual([...declared].sort());
      for (const property of properties) {
        const name = String(property.name);
        expect(SchemaAST.isOptional(property.type), `${typename}.${name}`).toBe(!required.includes(name));
      }
    });

    test('preserves type identity', ({ expect }) => {
      const annotations = SchemaAST.resolveAnnotations(toEffectSchema(document).ast) ?? {};
      expect((annotations as any)[TypeAnnotationId]?.typename).toBe(typename);
    });
  });
});

//
// The v3-only sentinels. `org.dxos.type.message` is the one production type carrying them: without
// these branches both fields would silently degrade to `Unknown`, which no type error would catch.
//
describe('v3-only sentinels', () => {
  const message = types['org.dxos.type.message'];

  test('the fixture still exercises both sentinels', ({ expect }) => {
    const serialized = JSON.stringify(message);
    expect(serialized).toContain('/schemas/unknown');
    expect(serialized).toContain('/schemas/any');
  });

  test('`/schemas/unknown` decodes to Unknown, not a struct', ({ expect }) => {
    const decoded = toEffectSchema({ $id: '/schemas/unknown' } as JsonSchemaType);
    expect(SchemaAST.isUnknownKeyword(decoded.ast)).toBe(true);
  });

  test('`/schemas/any` decodes to Any', ({ expect }) => {
    const decoded = toEffectSchema({ $id: '/schemas/any' } as JsonSchemaType);
    expect(SchemaAST.isAnyKeyword(decoded.ast)).toBe(true);
  });

  test('`/schemas/{}` decodes to an empty struct', ({ expect }) => {
    const decoded = toEffectSchema({ $id: '/schemas/{}' } as JsonSchemaType);
    const ast = SchemaAST.toType(decoded.ast);
    expect(SchemaAST.isObjects(ast)).toBe(true);
    expect(SchemaAST.getPropertySignatures(ast)).toHaveLength(0);
  });

  test('a message decodes with its sentinel-typed fields intact', ({ expect }) => {
    const properties = propertiesOf(toEffectSchema(message));
    expect(properties.length).toBeGreaterThan(0);
  });
});

//
// References are the densest construct in the corpus (38 occurrences) and the one the v4 emitter
// reshapes most, so the DXN has to survive the read.
//
describe('references', () => {
  test('`/schemas/echo/ref` keeps its target DXN', ({ expect }) => {
    const file = types['org.dxos.type.file'];
    const properties = propertiesOf(toEffectSchema(file));
    const data = properties.find((property) => String(property.name) === 'data');
    expect(data).toBeDefined();

    const annotations = SchemaAST.resolveAnnotations(data!.type) ?? {};
    expect(JSON.stringify(annotations)).toContain('org.dxos.type.blob');
  });
});
