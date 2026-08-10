import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';

import * as Ast from '../src/ast';
import { isRepresentationDocument } from '../src/dispatch';
import { type StoredType, fromType, getSchema, toType, transform } from '../src/migration';

const corpus = JSON.parse(
  readFileSync(fileURLToPath(new URL('../corpus-v3.json', import.meta.url)), 'utf-8'),
) as Record<string, any>;

const entities: StoredType[] = Object.entries(corpus).map(([name, jsonSchema]) => ({ name, jsonSchema }));

describe('org.dxos.type.schema 0.1.0 -> 0.2.0', () => {
  test('type URIs are the versioned meta-type', () => {
    expect(fromType).toBe('dxn:org.dxos.type.schema:0.1.0');
    expect(toType).toBe('dxn:org.dxos.type.schema:0.2.0');
  });

  test('migrates every stored type in the corpus', () => {
    for (const entity of entities) {
      expect(isRepresentationDocument(entity.jsonSchema)).toBe(false);
      const migrated = transform(entity);
      expect(isRepresentationDocument(migrated.jsonSchema), entity.name).toBe(true);
      expect(migrated.name).toBe(entity.name);
    }
  });

  test('is idempotent — a second run is a no-op', () => {
    for (const entity of entities) {
      const once = transform(entity);
      const twice = transform(once);
      expect(twice.jsonSchema, entity.name).toEqual(once.jsonSchema);
      expect(twice).toBe(once);
    }
  });

  test('preserves the readable schema across the migration', () => {
    for (const entity of entities) {
      const before = Ast.getProperties(getSchema(entity).ast).map((p) => [String(p.name), p.isOptional, p.type._tag]);
      const after = Ast.getProperties(getSchema(transform(entity)).ast).map((p) => [
        String(p.name),
        p.isOptional,
        p.type._tag,
      ]);
      expect(after, entity.name).toEqual(before);
    }
  });

  test('a partially-migrated space reads uniformly', () => {
    // Peers migrate independently, so a space can hold both encodings at once.
    const mixed = entities.map((entity, index) => (index % 2 === 0 ? transform(entity) : entity));
    for (const entity of mixed) {
      expect(getSchema(entity).ast._tag).toBe('Objects');
    }
  });
});
