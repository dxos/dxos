//
// Copyright 2024 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';
import { beforeEach, describe, expect, it } from 'vitest';

import { Filter, Query, Type } from '@dxos/echo';
import { createEchoSchema } from '@dxos/echo/testing';
import { ProjectionModel, View, createDirectChangeCallback } from '@dxos/schema';

import { Table } from '../types';

import { TableModel, type TableModelProps } from './table-model';
import { TablePresentation } from './table-presentation';

describe('TablePresentation', () => {
  describe('getCells', () => {
    let registry: Registry.Registry;
    let data: any[];
    let model: any;
    let presentation: TablePresentation;

    beforeEach(async () => {
      registry = Registry.make();
      data = [
        { id: '1', title: 'A', count: 1 },
        { id: '2', title: 'B', count: 2 },
      ];

      model = createTableModel(registry, {});
      await model.open();
      model.setRows(data);
      presentation = new TablePresentation(registry, model);
    });

    it('should return cells for the visible range', () => {
      const cells = presentation.getCells({ start: { row: 0, col: 0 }, end: { row: 1, col: 2 } }, 'grid');

      // Verify that cells are returned for the range. The exact column indices depend on the projection.
      const cellKeys = Object.keys(cells);
      expect(cellKeys.length).toBeGreaterThan(0);

      // Check that values from the data are present in the cells.
      const values = Object.values(cells).map((c) => c.value);
      expect(values).toContain('A');
      expect(values).toContain('B');
    });

    it('should reflect row data changes', () => {
      // Update the row data and refresh.
      data[0].title = 'New Value';
      model.setRows(data);

      // Verify the new value through getCells.
      const cells = presentation.getCells({ start: { row: 0, col: 0 }, end: { row: 0, col: 2 } }, 'grid');
      const values = Object.values(cells).map((c) => c.value);
      expect(values).toContain('New Value');
    });

    it('should reflect new rows', () => {
      // Add a new row.
      data.push({ id: '3', title: 'C', count: 3 });
      model.setRows(data);

      const cells = presentation.getCells({ start: { row: 0, col: 0 }, end: { row: 2, col: 2 } }, 'grid');

      // Verify the new row's data.
      expect(cells['0,2']?.value).toBe('C');
      expect(cells['1,2']?.value).toBe('3');
    });

    it('should handle row modifications', () => {
      // Modify the data.
      data[0].title = 'Updated A';
      data.push({ id: '3', title: 'C', count: 3 });
      data.splice(1, 1);
      model.setRows(data);

      const cells = presentation.getCells({ start: { row: 0, col: 0 }, end: { row: 1, col: 2 } }, 'grid');

      // Verify final state.
      expect(cells['0,0']?.value).toBe('Updated A');
      expect(cells['0,1']?.value).toBe('C');
    });
  });
});

const Test = Schema.Struct({
  title: Schema.String,
  count: Schema.Number,
}).pipe(
  Type.Obj({
    typename: 'example.com/type/Test',
    version: '0.1.0',
  }),
);

const createTableModel = (registry: Registry.Registry, props: Partial<TableModelProps> = {}): TableModel => {
  const schema = createEchoSchema(Test);
  const view = View.make({
    query: Query.select(Filter.type(schema)),
    jsonSchema: schema.jsonSchema,
  });
  const object = Table.make({ view });
  const projection = new ProjectionModel({
    registry,
    view,
    baseSchema: schema.jsonSchema,
    change: createDirectChangeCallback(view.projection, schema.jsonSchema),
  });
  projection.normalizeView();
  return new TableModel({ registry, object, projection, ...props });
};
