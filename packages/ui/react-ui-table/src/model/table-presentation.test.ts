//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';
import { describe, expect, it, beforeEach } from 'vitest';

import { Obj } from '@dxos/echo';
import { TypedObject } from '@dxos/echo-schema';
import { live } from '@dxos/live-object';
import { createEchoSchema } from '@dxos/live-object/testing';
import { createView } from '@dxos/schema';

import { TableModel, type TableModelProps } from './table-model';
import { TablePresentation } from './table-presentation';
import { TableView } from '../types';

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
          { col1: 'A', col2: 1, col3: true },
          { col1: 'B', col2: 2, col3: false },
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
      data[0].col1 = 'New Value';
      expect(updateCount).toBe(1);

      // Verify the new value through getCells.
      const cells = presentation.getCells({ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } }, 'grid');
      expect(cells['0,0']?.value).toBe('New Value');
    });

    it('should update reactively when adding a new row', () => {
      // Set up visible range to include our test data.
      presentation.getCells({ start: { row: 0, col: 0 }, end: { row: 2, col: 2 } }, 'grid');

      data.push({ col1: 'C', col2: 3, col3: true });
      expect(updateCount).toBe(1);

      const cells = presentation.getCells({ start: { row: 0, col: 0 }, end: { row: 2, col: 2 } }, 'grid');

      // Verify the new row's data.
      expect(cells['0,2']?.value).toBe('C');
      expect(cells['1,2']?.value).toBe('3');
      expect(cells['2,2']?.value).toBe('true');
    });

    it('should handle combined operations reactively', () => {
      // Set up visible range.
      presentation.getCells({ start: { row: 0, col: 0 }, end: { row: 2, col: 2 } }, 'grid');

      // Multiple operations.
      data[0].col1 = 'Updated A';
      data.push({ col1: 'C', col2: 3, col3: true });
      data.splice(1, 1);

      // We expect one update per operation affecting visible rows.
      expect(updateCount).toBe(3);

      const cells = presentation.getCells({ start: { row: 0, col: 0 }, end: { row: 1, col: 2 } }, 'grid');

      // Verify final state.
      expect(cells['0,0']?.value).toBe('Updated A');
      expect(cells['0,1']?.value).toBe('C');
      expect(cells['1,1']?.value).toBe('3');
      expect(cells['2,1']?.value).toBe('true');
    });
  });
});

class Test extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
  title: Schema.String,
  completed: Schema.Boolean,
}) {}

const createTableModel = (props: Partial<TableModelProps> = {}): TableModel => {
  const schema = createEchoSchema(Test);
  const table = Obj.make(TableView, { sizes: {} });
  const view = createView({ typename: schema.typename, jsonSchema: schema.jsonSchema, presentation: table });
  return new TableModel({ view, schema: schema.jsonSchema, ...props });
};
