//
// Copyright 2025 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';
import { act, renderHook } from '@testing-library/react';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj, Query, Type } from '@dxos/echo';
import { Format, FormatAnnotation, PropertyMetaAnnotationId } from '@dxos/echo/internal';
import { ObjectId } from '@dxos/keys';
import { ProjectionModel, View, createDirectChangeCallback } from '@dxos/schema';

import { Kanban } from '../types';

import { useKanbanBoardModel } from './useKanbanBoardModel';

// TODO(wittjosiah): Consider adding single-select to TestSchema.Task and using that instead.
const KanbanTaskSchema = Schema.Struct({
  title: Schema.optional(Schema.String),
  status: Schema.Literal('__uncategorized__', 'a', 'b').pipe(
    FormatAnnotation.set(Format.TypeFormat.SingleSelect),
    Schema.annotations({
      title: 'Status',
      [PropertyMetaAnnotationId]: {
        singleSelect: {
          options: [
            { id: '__uncategorized__', title: 'Uncategorized', color: 'neutral' },
            { id: 'a', title: 'A', color: 'blue' },
            { id: 'b', title: 'B', color: 'green' },
          ],
        },
      },
    }),
    Schema.optional,
  ),
}).pipe(
  Type.object({
    typename: 'example.com/type/KanbanTask',
    version: '0.1.0',
  }),
);

type KanbanTask = Schema.Schema.Type<typeof KanbanTaskSchema>;

describe('useKanbanBoardModel', () => {
  let registry: Registry.Registry;
  let view: View.View;
  let kanban: Kanban.Kanban;
  let projection: ProjectionModel;

  beforeEach(() => {
    registry = Registry.make();
    const jsonSchema = Type.toJsonSchema(KanbanTaskSchema) as Parameters<typeof createDirectChangeCallback>[1];
    view = View.make({
      query: Query.select(Filter.type(KanbanTaskSchema)),
      jsonSchema,
      pivotFieldName: 'status',
    });
    kanban = Kanban.make({
      view: view,
      arrangement: {
        order: ['a', 'b'],
        columns: { a: { ids: [] }, b: { ids: [] } },
      },
    });
    projection = new ProjectionModel({
      registry,
      view,
      baseSchema: jsonSchema,
      change: createDirectChangeCallback(view.projection, jsonSchema),
    });
  });

  afterEach(() => {});

  test('returns model with getColumns and getItems', ({ expect }) => {
    const itemA = Obj.make(KanbanTaskSchema, { status: 'a' });
    const itemB = Obj.make(KanbanTaskSchema, { status: 'b' });
    const initialItems: KanbanTask[] = [itemA, itemB];
    const itemsAtom = Atom.make<KanbanTask[]>(() => initialItems);

    const { result } = renderHook(() => useKanbanBoardModel(kanban, projection, itemsAtom, registry));

    const model = result.current;
    expect(model.getColumnId).toBeDefined();
    expect(model.getItemId).toBeDefined();
    expect(model.isColumn).toBeDefined();
    expect(model.isItem).toBeDefined();

    const columns = model.getColumns();
    expect(columns.length).toBeGreaterThanOrEqual(1);
    const columnValues = columns.map((col) => col.columnValue);
    expect(columnValues).toContain('a');
    expect(columnValues).toContain('b');

    const colA = columns.find((c) => c.columnValue === 'a');
    const colB = columns.find((c) => c.columnValue === 'b');
    expect(colA).toBeDefined();
    expect(colB).toBeDefined();

    const itemsA = model.getItems(colA!);
    const itemsB = model.getItems(colB!);
    expect(itemsA.map((i) => i.id)).toContain(itemA.id);
    expect(itemsB.map((i) => i.id)).toContain(itemB.id);
  });

  test('getItems updates when itemsAtom source changes', ({ expect }) => {
    const initialItem = Obj.make(KanbanTaskSchema, { status: 'a' });
    const initialItems: KanbanTask[] = [initialItem];
    const initialItemsAtom = Atom.make<KanbanTask[]>(() => initialItems);

    const { result, rerender } = renderHook(
      ({ itemsAtom }) => useKanbanBoardModel(kanban, projection, itemsAtom, registry),
      { initialProps: { itemsAtom: initialItemsAtom } },
    );

    const columns = result.current.getColumns();
    const colA = columns.find((c) => c.columnValue === 'a');
    expect(colA).toBeDefined();
    expect(result.current.getItems(colA!).length).toBe(1);
    expect(result.current.getItems(colA!).map((i) => i.id)).toEqual([initialItem.id]);

    const secondItem = Obj.make(KanbanTaskSchema, { status: 'a' });
    const newItems: KanbanTask[] = [initialItem, secondItem];
    const newItemsAtom = Atom.make<KanbanTask[]>(() => newItems);
    act(() => {
      rerender({ itemsAtom: newItemsAtom });
    });

    expect(result.current.getItems(colA!).length).toBe(2);
    expect(result.current.getItems(colA!).map((i) => i.id)).toEqual([initialItem.id, secondItem.id]);
  });

  test('columns atom updates when kanban arrangement changes', ({ expect }) => {
    const itemsAtom = Atom.make<KanbanTask[]>(() => []);
    const { result } = renderHook(() => useKanbanBoardModel(kanban, projection, itemsAtom, registry));

    let columnsUpdateCount = 0;
    registry.subscribe(result.current.columns, () => {
      columnsUpdateCount++;
    });

    const columnsBefore = result.current.getColumns();
    const orderBefore = columnsBefore.map((c) => c.columnValue);
    expect(orderBefore).toEqual(['__uncategorized__', 'a', 'b']);

    act(() => {
      Obj.change(kanban, (kanban) => {
        kanban.arrangement.order = ['b', 'a'];
      });
    });

    const columnsAfter = registry.get(result.current.columns) ?? [];
    const orderAfter = columnsAfter.map((c) => c.columnValue);
    expect(orderAfter).toEqual(['__uncategorized__', 'b', 'a']);
    // TODO(wittjosiah): Try to reduce to 1.
    expect(columnsUpdateCount).toBe(2);
  });

  test('getItems returns items in column ordered by arrangement ids', ({ expect }) => {
    const item1 = Obj.make(KanbanTaskSchema, {
      id: ObjectId.random(),
      status: 'a',
    });
    const item2 = Obj.make(KanbanTaskSchema, {
      id: ObjectId.random(),
      status: 'a',
    });
    const item3 = Obj.make(KanbanTaskSchema, {
      id: ObjectId.random(),
      status: 'a',
    });
    const items: KanbanTask[] = [item1, item2, item3];
    const itemsAtom = Atom.make<KanbanTask[]>(() => items);

    const { result } = renderHook(() => useKanbanBoardModel(kanban, projection, itemsAtom, registry));

    const columns = result.current.getColumns();
    const colA = columns.find((c) => c.columnValue === 'a');
    expect(colA).toBeDefined();
    expect(result.current.getItems(colA!).length).toBe(3);

    let itemsColAUpdateCount = 0;
    registry.subscribe(result.current.items(colA!), () => {
      itemsColAUpdateCount++;
    });

    act(() => {
      Obj.change(kanban, (kanban) => {
        kanban.arrangement.columns['a'] = {
          ids: [item3.id, item1.id, item2.id],
        };
      });
    });

    const itemsAfter = result.current.getItems(colA!);
    expect(itemsAfter.map((i) => i.id)).toEqual([item3.id, item1.id, item2.id]);
    expect(itemsColAUpdateCount).toBe(1);
  });

  test('subscribing to one column items atom does not fire when another column changes', ({ expect }) => {
    const itemA = Obj.make(KanbanTaskSchema, {
      id: ObjectId.random(),
      status: 'a',
    });
    const itemB = Obj.make(KanbanTaskSchema, {
      id: ObjectId.random(),
      status: 'b',
    });
    const items: KanbanTask[] = [itemA, itemB];
    const itemsAtom = Atom.make<KanbanTask[]>(() => items);

    const { result } = renderHook(() => useKanbanBoardModel(kanban, projection, itemsAtom, registry));

    const columns = result.current.getColumns();
    const colA = columns.find((c) => c.columnValue === 'a');
    const colB = columns.find((c) => c.columnValue === 'b');
    expect(colA).toBeDefined();
    expect(colB).toBeDefined();

    let itemsColAUpdateCount = 0;
    registry.subscribe(result.current.items(colA!), () => {
      itemsColAUpdateCount++;
    });

    act(() => {
      Obj.change(kanban, (kanban) => {
        kanban.arrangement.columns['b'] = { ids: [itemB.id] };
      });
    });

    expect(itemsColAUpdateCount).toBe(0);
  });
});
