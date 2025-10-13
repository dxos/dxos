//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';
import { beforeEach, describe, expect, it } from 'vitest';

import { Filter, Query } from '@dxos/echo';
import { TypedObject } from '@dxos/echo/internal';
import { live } from '@dxos/live-object';
import { createEchoSchema } from '@dxos/echo/testing';
import { createView } from '@dxos/schema';

import { Table } from '../types';

import { TableModel, type TableModelProps } from './table-model';
import { TablePresentation } from './table-presentation';

describe('TablePresentation', () => {
  describe('row reactivity', () => {
    let data: any[];
    let updateCount: number;
    let model: any;
    let presentation: TablePresentation;

    beforeEach(async () => {
      updateCount = 0;
      ({ data } = live({
        data: [
          { title: 'A', count: 1 },
          { title: 'B', count: 2 },
        ],
      }));

      model = createTableModel({
        onCellUpdate: () => updateCount++,
      });
      model.setRows(data);
      await model.open();
      presentation = new TablePresentation(model);
    });

    it('should update with row-level reactivity', () => {
      // Set up visible range to include our test data.
      presentation.getCells({ start: { row: 0, col: 0 }, end: { row: 1, col: 2 } }, 'grid');

      // Trigger a row update.
      data[0].title = 'New Value';
      expect(updateCount).toBe(2);

      // Verify the new value through getCells.
      const cells = presentation.getCells({ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } }, 'grid');
      expect(cells['0,0']?.value).toBe('New Value');
    });

    it('should update reactively when adding a new row', () => {
      // Set up visible range to include our test data.
      presentation.getCells({ start: { row: 0, col: 0 }, end: { row: 2, col: 2 } }, 'grid');

      data.push({ title: 'C', count: 3 });
      expect(updateCount).toBe(2);

      const cells = presentation.getCells({ start: { row: 0, col: 0 }, end: { row: 2, col: 2 } }, 'grid');

      // Verify the new row's data.
      expect(cells['0,2']?.value).toBe('C');
      expect(cells['1,2']?.value).toBe('3');
    });

    it('should handle combined operations reactively', () => {
      // Set up visible range.
      presentation.getCells({ start: { row: 0, col: 0 }, end: { row: 2, col: 2 } }, 'grid');

      // Multiple operations.
      data[0].title = 'Updated A';
      data.push({ title: 'C', count: 3, completed: true });
      data.splice(1, 1);

      // We expect one update per operation affecting visible rows.
      expect(updateCount).toBe(4);

      const cells = presentation.getCells({ start: { row: 0, col: 0 }, end: { row: 1, col: 2 } }, 'grid');

      // Verify final state.
      expect(cells['0,0']?.value).toBe('Updated A');
      expect(cells['0,1']?.value).toBe('C');
    });
  });
});

class Test extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
  title: Schema.String,
  count: Schema.Number,
}) {}

const createTableModel = (props: Partial<TableModelProps> = {}): TableModel => {
  const schema = createEchoSchema(Test);
  const table = Table.make();
  const view = createView({
    query: Query.select(Filter.type(schema)),
    jsonSchema: schema.jsonSchema,
    presentation: table,
  });
  return new TableModel({ view, schema: schema.jsonSchema, ...props });
};
