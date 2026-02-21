//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { beforeEach, describe, test } from 'vitest';

import { Filter, Query, Type } from '@dxos/echo';
import { ObjectId } from '@dxos/keys';
import { View } from '@dxos/schema';

import { Kanban, UNCATEGORIZED_VALUE } from '../types';

import {
  computeColumnStructure,
  computeItemArrangement,
  getOrderByColumnFromArrangement,
  getOrderFromArrangement,
} from './arrangement';

const selectOptions = [
  { id: UNCATEGORIZED_VALUE, title: 'Uncategorized', color: 'neutral' },
  { id: 'a', title: 'A', color: 'blue' },
  { id: 'b', title: 'B', color: 'green' },
];

const MinimalSchema = Schema.Struct({ id: Schema.String }).pipe(
  Type.object({ typename: 'test/Minimal', version: '0.1.0' }),
);

describe('arrangement utils', () => {
  let view: View.View;

  beforeEach(() => {
    view = View.make({
      query: Query.select(Filter.type(MinimalSchema)),
      jsonSchema: Type.toJsonSchema(MinimalSchema),
    });
  });

  describe('getOrderFromArrangement', () => {
    test('returns copy of order when present', ({ expect }) => {
      const arrangement = { order: ['a', 'b'], columns: {} };
      expect(getOrderFromArrangement(arrangement)).toEqual(['a', 'b']);
    });

    test('returns copy of order from kanban arrangement', ({ expect }) => {
      const kanban = Kanban.make({
        view,
        arrangement: { order: ['b', 'a'], columns: {} },
      });
      const order = getOrderFromArrangement(kanban.arrangement);
      expect(order).toEqual(['b', 'a']);
      order.push('x');
      expect(getOrderFromArrangement(kanban.arrangement)).toEqual(['b', 'a']);
    });

    test('returns empty when arrangement or order missing or empty', ({ expect }) => {
      expect(getOrderFromArrangement(undefined)).toEqual([]);
      expect(getOrderFromArrangement({ order: [], columns: {} })).toEqual([]);
      const kanbanEmptyOrder = Kanban.make({
        view,
        arrangement: { order: [], columns: {} },
      });
      expect(getOrderFromArrangement(kanbanEmptyOrder.arrangement)).toEqual([]);
    });
  });

  describe('getOrderByColumnFromArrangement', () => {
    test('returns per-column data with mutable id arrays', ({ expect }) => {
      const arrangement = {
        order: [],
        columns: { a: { ids: ['i1'] } },
      };
      const byColumn = getOrderByColumnFromArrangement(arrangement);
      expect(byColumn.a.ids).toEqual(['i1']);
      byColumn.a.ids.push('i2');
      expect(getOrderByColumnFromArrangement(arrangement).a.ids).toEqual(['i1']);
    });

    test('returns per-column ids and preserves hidden from kanban arrangement', ({ expect }) => {
      const id1 = ObjectId.random();
      const id2 = ObjectId.random();
      const id3 = ObjectId.random();
      const kanban = Kanban.make({
        view,
        arrangement: {
          order: [],
          columns: {
            a: { ids: [id1, id2], hidden: true },
            b: { ids: [id3] },
          },
        },
      });
      const byColumn = getOrderByColumnFromArrangement(kanban.arrangement);
      expect(byColumn.a).toEqual({ ids: [id1, id2], hidden: true });
      expect(byColumn.b).toEqual({ ids: [id3] });
      expect(byColumn.b.hidden).toBeUndefined();
    });

    test('returns mutable copies', ({ expect }) => {
      const idX = ObjectId.random();
      const kanban = Kanban.make({
        view,
        arrangement: { order: [], columns: { a: { ids: [idX] } } },
      });
      const byColumn = getOrderByColumnFromArrangement(kanban.arrangement);
      byColumn.a.ids.push(ObjectId.random());
      expect(getOrderByColumnFromArrangement(kanban.arrangement).a.ids).toEqual([idX]);
    });

    test('returns empty object when arrangement or columns missing', ({ expect }) => {
      expect(getOrderByColumnFromArrangement(undefined)).toEqual({});
      expect(getOrderByColumnFromArrangement({ order: [], columns: {} })).toEqual({});
      const kanbanEmpty = Kanban.make({
        view,
        arrangement: { order: [], columns: {} },
      });
      expect(getOrderByColumnFromArrangement(kanbanEmpty.arrangement)).toEqual({});
    });
  });

  describe('computeColumnStructure', () => {
    test('uncategorized first, then effectiveOrder, then missing selectOptions', ({ expect }) => {
      const effectiveOrder = ['b'];
      const effectiveByColumn = { [UNCATEGORIZED_VALUE]: { ids: ['x'] }, b: { ids: ['y'] } };
      const result = computeColumnStructure(effectiveOrder, effectiveByColumn, selectOptions);
      expect(result.map((col) => col.columnValue)).toEqual([UNCATEGORIZED_VALUE, 'b', 'a']);
      expect(result[0].ids).toEqual(['x']);
      expect(result[1].ids).toEqual(['y']);
      expect(result[2].ids).toEqual([]);
    });

    test('does not duplicate uncategorized when already in effectiveOrder', ({ expect }) => {
      const effectiveOrder = [UNCATEGORIZED_VALUE, 'a'];
      const effectiveByColumn = {};
      const result = computeColumnStructure(effectiveOrder, effectiveByColumn, selectOptions);
      expect(result.map((col) => col.columnValue)).toEqual([UNCATEGORIZED_VALUE, 'a', 'b']);
    });
  });

  describe('computeItemArrangement', () => {
    test('distributes items by pivotPath and preserves saved order within column', ({ expect }) => {
      const idUc1 = ObjectId.random();
      const idA1 = ObjectId.random();
      const idA2 = ObjectId.random();
      const idA3 = ObjectId.random();
      const kanban = Kanban.make({
        view,
        arrangement: {
          order: ['a', 'b'],
          columns: {
            [UNCATEGORIZED_VALUE]: { ids: [idUc1] },
            a: { ids: [idA2, idA1] },
            b: { ids: [] },
          },
        },
      });
      const items = [{ id: idA1, status: 'a' }, { id: idA2, status: 'a' }, { id: idA3, status: 'a' }, { id: idUc1 }];
      const result = computeItemArrangement({
        object: kanban,
        items,
        pivotPath: 'status',
        selectOptions,
      });
      const colUncat = result.find((c) => c.columnValue === UNCATEGORIZED_VALUE);
      const colA = result.find((c) => c.columnValue === 'a');
      const colB = result.find((c) => c.columnValue === 'b');
      expect(colUncat?.cards.map((c) => c.id)).toEqual([idUc1]);
      expect(colA?.cards.map((c) => c.id)).toEqual([idA2, idA1, idA3]);
      expect(colB?.cards.map((c) => c.id)).toEqual([]);
    });

    test('when pivotPath undefined all items go to uncategorized', ({ expect }) => {
      const kanban = Kanban.make({
        view,
        arrangement: { order: ['a', 'b'], columns: { a: { ids: [] }, b: { ids: [] } } },
      });
      const items = [
        { id: '1', status: 'a' },
        { id: '2', status: 'b' },
      ];
      const result = computeItemArrangement({
        object: kanban,
        items,
        selectOptions,
      });
      const colUncat = result.find((c) => c.columnValue === UNCATEGORIZED_VALUE);
      const colA = result.find((c) => c.columnValue === 'a');
      expect(colUncat?.cards.length).toBe(2);
      expect(colA?.cards.length).toBe(0);
    });

    test('column order is uncategorized then selectOptions', ({ expect }) => {
      const kanban = Kanban.make({
        view,
        arrangement: { order: ['a', 'b'], columns: {} },
      });
      const result = computeItemArrangement({
        object: kanban,
        items: [],
        selectOptions,
      });
      expect(result.map((c) => c.columnValue)).toEqual([UNCATEGORIZED_VALUE, 'a', 'b']);
    });
  });
});
