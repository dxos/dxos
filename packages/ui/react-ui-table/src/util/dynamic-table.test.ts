//
// Copyright 2025 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import { describe, expect, test } from 'vitest';

import { Format } from '@dxos/echo';

import { type TablePropertyDefinition, getBaseSchema, makeDynamicTable } from './dynamic-table';

describe('makeDynamicTable', () => {
  /**
   * Builds the Type entity from a JSON schema, then makes the table.
   * Confirms makeDynamicTable + setProperties (title) works for the jsonSchema path.
   */
  test('makeDynamicTable from a jsonSchema with properties with title does not throw', () => {
    const registry = Registry.make();
    const jsonSchema = {
      typename: 'com.example.type.dynamicTablePlain',
      version: '0.1.0',
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
      const { type } = getBaseSchema({ jsonSchema });
      const { projection, object } = makeDynamicTable({ registry, type, properties });
      expect(projection).toBeDefined();
      expect(object).toBeDefined();
      expect(projection.getFields().length).toBeGreaterThan(0);
    }).not.toThrow();
  });

  /**
   * Builds the Type entity from property definitions, then makes the table.
   * Confirms makeDynamicTable + setProperties (title) works for the property-definitions path.
   */
  test('makeDynamicTable from getBaseSchema(typename, properties) with properties with title does not throw', () => {
    const registry = Registry.make();
    const typename = 'com.example.type.dynamicTableTest';
    const properties: TablePropertyDefinition[] = [
      { name: 'id', format: Format.TypeFormat.String },
      { name: 'name', format: Format.TypeFormat.String, title: 'Name' },
    ];

    expect(() => {
      const { type } = getBaseSchema({ typename, properties });
      const { projection, object } = makeDynamicTable({ registry, type, properties });
      expect(projection).toBeDefined();
      expect(object).toBeDefined();
      expect(projection.getFields().length).toBeGreaterThan(0);
    }).not.toThrow();
  });
});
