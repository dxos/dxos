//
// Copyright 2025 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import { describe, expect, test } from 'vitest';

import { Format } from '@dxos/echo';

import { type TablePropertyDefinition, getBaseSchema, makeDynamicTable } from './dynamic-table';

describe('makeDynamicTable', () => {
  /**
   * Base case: plain jsonSchema (not from Echo / Type.toJsonSchema). Does not exercise the path
   * where projection or schema are reactive, so this does not reproduce the Obj.change regression.
   * Confirms makeDynamicTable + setProperties (title) works with plain objects.
   */
  test('makeDynamicTable with plain jsonSchema and properties with title does not throw', () => {
    const registry = Registry.make();
    const jsonSchema = {
      type: 'object' as const,
      properties: {
        id: { type: 'string' as const },
        name: { type: 'string' as const },
      },
      required: ['id'],
    };
    const properties: TablePropertyDefinition[] = [
      { name: 'id', format: Format.TypeFormat.String },
      { name: 'name', format: Format.TypeFormat.String, title: 'Name' },
    ];

    expect(() => {
      const { projection, object } = makeDynamicTable({
        registry,
        jsonSchema,
        properties,
      });
      expect(projection).toBeDefined();
      expect(object).toBeDefined();
      expect(projection.getFields().length).toBeGreaterThan(0);
    }).not.toThrow();
  });

  /**
   * Regression test for the path where jsonSchema comes from getBaseSchema(typename, properties).
   * That path uses Echo (View.make, Type.toJsonSchema); mutations must run inside Obj.change and on a
   * cloned schema. This test ensures that flow does not throw.
   */
  test('makeDynamicTable with jsonSchema from getBaseSchema(typename, properties) and properties with title does not throw', () => {
    const registry = Registry.make();
    const typename = 'example.com/type/DynamicTableTest';
    const properties: TablePropertyDefinition[] = [
      { name: 'id', format: Format.TypeFormat.String },
      { name: 'name', format: Format.TypeFormat.String, title: 'Name' },
    ];
    const { jsonSchema } = getBaseSchema({ typename, properties });

    expect(() => {
      const { projection, object } = makeDynamicTable({
        registry,
        jsonSchema,
        properties,
      });
      expect(projection).toBeDefined();
      expect(object).toBeDefined();
      expect(projection.getFields().length).toBeGreaterThan(0);
    }).not.toThrow();
  });
});
