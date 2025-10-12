//
// Copyright 2024 DXOS.org
//

import { computed } from '@preact/signals-core';
import { Schema } from 'effect';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Filter, Query } from '@dxos/echo';
import { TypedObject } from '@dxos/echo-schema';
import { updateCounter } from '@dxos/echo-schema/testing';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { live } from '@dxos/live-object';
import { createEchoSchema } from '@dxos/live-object/testing';
import { createView } from '@dxos/schema';

import { Table } from '../types';

import { TableModel, type TableModelProps } from './table-model';

// TODO(burdon): Tests are disabled in project.json since they bring in plugin deps.
//  Restore once factored out into react-ui-table.

registerSignalsRuntime();

describe('TableModel', () => {
  let updateCount = 0;
  let model: any;

  beforeEach(async () => {
    updateCount = 0;
    model = createTableModel({
      onCellUpdate: () => updateCount++,
    });
    await model.open();
    model.setRows([
      { id: '1', title: 'Test', completed: false },
      { id: '2', title: 'Test 2', completed: true },
      { id: '3', title: 'Test 3', completed: false },
    ]);
  });

  afterEach(async () => {
    await model.close();
  });

  describe('methods', () => {
    it('should pin a row', () => {
      model.pinRow(1, 'top');
      expect(model.pinnedRows.top).toContain(1);
    });

    it('should unpin a row', () => {
      model.pinRow(1, 'top');
      model.unpinRow(1);
      expect(model.pinnedRows.top).not.toContain(1);
    });

    it('should toggle row selection', () => {
      model.selection.toggleSelectionForRowIndex(2);
      expect(model.selection.hasSelection.value).toBe(true);
    });

    it('should deselect a row', () => {
      model.selection.toggleSelectionForRowIndex(2);
      model.selection.toggleSelectionForRowIndex(2);
      expect(model.selection.hasSelection.value).toBe(false);
    });

    it('should bulk select rows', () => {
      model.selection.setSelection('all');
      expect(model.selection.allRowsSeleted.value).toBe(true);
      model.selection.setSelection('none');
      expect(model.selection.hasSelection.value).toBe(false);
    });
  });

  describe('reactivity', () => {
    it('pure signals should nest', () => {
      const signal$ = live({ arr: [{ thingInside: 1 }, { thingInside: 2 }] });
      const computed$ = computed(() => {
        return signal$.arr.map((row) =>
          computed(() => {
            return row.thingInside;
          }),
        );
      });

      using outerCounter = updateCounter(() => {
        computed$.value.map((c) => c.value);
      });

      using innerCounter = updateCounter(() => {
        computed$.value[0].value;
      });

      expect(computed$.value.map((v) => v.value)).toEqual([1, 2]);

      signal$.arr[0].thingInside = 3;

      expect(computed$.value.map((v) => v.value)).toEqual([3, 2]);
      expect(outerCounter.count).toBe(1);
      expect(innerCounter.count).toBe(1);
    });
  });
});

class Test extends TypedObject({ typename: 'example.com/type/Test', version: '0.1.0' })({
  title: Schema.String,
  completed: Schema.Boolean,
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
