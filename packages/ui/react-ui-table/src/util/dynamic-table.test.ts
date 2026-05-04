//
// Copyright 2025 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import { describe, expect, test } from 'vitest';

import { Format } from '@dxos/echo';

import { type TablePropertyDefinition, getBaseSchema, makeDynamicTable } from './dynamic-table';

// Quarantined in CI only — flaky under the workflow's `--no-file-parallelism`
// runner / hoisted node_modules layout. Local runs still cover the suite so
// regressions surface during development.
// Trunk.io tracking:
//   https://app.trunk.io/dxos/flaky-tests/test/fe424f97-f8a1-5f2f-a191-5b3ec4e8f6b7
//   https://app.trunk.io/dxos/flaky-tests/test/ee00f293-9b9b-55ed-b4cd-48a07edea96c
const describeOutsideCI = process.env.CI ? describe.skip : describe;
describeOutsideCI('makeDynamicTable', () => {
  /**
   * Base case: plain jsonSchema (not from Echo / JsonSchema.toJsonSchema). Does not exercise the path
   * where projection or schema are reactive, so this does not reproduce the Obj.update regression.
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
   * That path uses Echo (ViewModel.make, JsonSchema.toJsonSchema); mutations must run inside Obj.update and on a
   * cloned schema. This test ensures that flow does not throw.
   */
  test('makeDynamicTable with jsonSchema from getBaseSchema(typename, properties) and properties with title does not throw', () => {
    const registry = Registry.make();
    const typename = 'com.example.type.dynamicTableTest';
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
