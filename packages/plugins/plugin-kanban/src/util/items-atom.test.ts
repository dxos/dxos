//
// Copyright 2026 DXOS.org
//

import * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { TestSchema } from '@dxos/echo/testing';

import { Kanban } from '#types';

import { makeItemsAtom } from './items-atom.ts';

describe('makeItemsAtom', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('follows the item refs, not arrangement writes or card edits', async ({ expect }) => {
    const { db } = await builder.createDatabase({ types: [Kanban.Kanban, TestSchema.Expando] });
    const a = db.add(Obj.make(TestSchema.Expando, { status: 'todo' }));
    const b = db.add(Obj.make(TestSchema.Expando, { status: 'todo' }));
    const kanban = db.add(Kanban.makeItems({ pivotField: 'status', items: [Ref.make(a)] })) as Kanban.KanbanItems;

    const registry = AtomRegistry.make();
    const itemsAtom = makeItemsAtom(kanban);
    let fires = 0;
    registry.subscribe(itemsAtom, () => {
      fires++;
    });
    const ids = () => registry.get(itemsAtom).map((item) => item.id);
    await expect.poll(ids).toEqual([a.id]);
    const baseline = fires;

    Obj.update(kanban, (kanban) => {
      kanban.arrangement.columns.todo = { ids: [a.id] };
    });
    expect(fires).toBe(baseline);

    Obj.update(kanban, (kanban) => {
      kanban.spec.items.push(Ref.make(b));
    });
    await expect.poll(ids).toEqual([a.id, b.id]);

    const beforeEdit = fires;
    Obj.update(a, (a) => {
      a.status = 'done';
    });
    expect(fires).toBe(beforeEdit);

    Obj.update(kanban, (kanban) => {
      kanban.spec.items.splice(0, 1);
    });
    await expect.poll(ids).toEqual([b.id]);
  });
});
