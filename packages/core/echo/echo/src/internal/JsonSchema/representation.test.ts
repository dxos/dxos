//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

import { SchemaAST } from '@dxos/effect';

import { TypeAnnotationId } from '../Annotation/annotations';
import { toEffectSchema } from './json-schema';
import { type JsonSchemaType } from './json-schema-type';
import { fromRepresentationJson, isRepresentationDocument, toRepresentationJson } from './representation';

//
// Whether a stored schema survives the representation encoding, over the same corpus the v3 decode
// tests use. This is the gate on adopting `SchemaRepresentation` as the storage format: a lossy
// round-trip here means stored types would silently degrade on migration.
//

const types = JSON.parse(
  readFileSync(fileURLToPath(new URL('./json-schema-v3-corpus.json', import.meta.url)), 'utf-8'),
) as Record<string, JsonSchemaType>;
const typenames = Object.keys(types);

/** Structural summary of what a stored type must not lose. */
const shapeOf = (schema: Schema.Top) => {
  const ast = SchemaAST.toType(schema.ast);
  expect(SchemaAST.isObjects(ast)).toBe(true);
  return {
    properties: SchemaAST.getPropertySignatures(ast)
      .map((property) => ({
        name: String(property.name),
        optional: SchemaAST.isOptional(property.type),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    typename: (SchemaAST.resolveAnnotations(schema.ast) as any)?.[TypeAnnotationId]?.typename,
  };
};

describe('SchemaRepresentation round-trip', () => {
  describe.each(typenames)('%s', (typename) => {
    const original = toEffectSchema(types[typename]);

    test('survives schema -> representation -> schema', ({ expect }) => {
      const restored = fromRepresentationJson(toRepresentationJson(original));
      expect(shapeOf(restored)).toEqual(shapeOf(original));
    });

    test('is idempotent across a second round-trip', ({ expect }) => {
      const once = toRepresentationJson(original);
      const twice = toRepresentationJson(fromRepresentationJson(once));
      expect(twice).toEqual(once);
    });

    test('serializes to JSON-safe output', ({ expect }) => {
      const json = toRepresentationJson(original);
      expect(() => JSON.parse(JSON.stringify(json))).not.toThrow();
      expect(isRepresentationDocument(json)).toBe(true);
    });
  });
});

//
// References are the construct the JSON Schema write path provably loses (the `Ref` payload is
// dropped, which is the reason for adopting representations at all), so assert the target survives.
//
describe('references survive the round-trip', () => {
  test('a ref keeps its target through representation', ({ expect }) => {
    const original = toEffectSchema(types['org.dxos.type.file']);
    const restored = fromRepresentationJson(toRepresentationJson(original));

    const property = SchemaAST.getPropertySignatures(SchemaAST.toType(restored.ast)).find(
      (candidate) => String(candidate.name) === 'data',
    );
    expect(property).toBeDefined();

    const annotations = SchemaAST.resolveAnnotations(property!.type) ?? {};
    expect(JSON.stringify(annotations)).toContain('org.dxos.type.blob');
  });
});

//
// A v3 JSON Schema document and a representation document must stay tellable apart, since stored
// spaces will hold both until every space has been migrated.
//
describe('format dispatch', () => {
  test('a v3 document is not mistaken for a representation', ({ expect }) => {
    expect(isRepresentationDocument(types['org.dxos.type.person'])).toBe(false);
  });

  test('a representation document is recognized', ({ expect }) => {
    expect(isRepresentationDocument(toRepresentationJson(toEffectSchema(types['org.dxos.type.person'])))).toBe(true);
  });
});
