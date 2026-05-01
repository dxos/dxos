//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { defineObjectMigration } from '@dxos/client/echo';
import { Filter, JsonSchema, Obj, Query, Ref, Type, View } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { ViewModel } from '@dxos/schema';

import { Kanban } from './Kanban';
import { KanbanV1 } from './Kanban';

const TestCardSchema = Schema.Struct({ id: Schema.String }).pipe(
  Type.object({ typename: 'com.example/TestCard', version: '0.1.0' }),
);

/**
 * v0.1.0 → v0.2.0 migration: nests `view` under `spec: { kind: 'view', view }`.
 *
 * Mirrors the migration registered in `capabilities/migrations.ts`. Running it
 * here against a real ECHO database verifies that the transform produces a
 * v0.2.0-shaped object that's queryable as `Kanban.Kanban`.
 */
describe('Kanban migration v1 → v2', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const migration = defineObjectMigration({
    from: KanbanV1,
    to: Kanban,
    transform: async (from) => ({
      name: from.name,
      arrangement: from.arrangement,
      spec: { kind: 'view' as const, view: from.view },
    }),
    onMigration: async () => {},
  });

  test('migrates a v1 Kanban into the v2 view-variant shape', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase();
    await graph.schemaRegistry.register([KanbanV1, Kanban, View.View]);

    // Build a real View object so the v1 Kanban has a valid ref to migrate.
    const view = ViewModel.make({
      query: Query.select(Filter.type(TestCardSchema)),
      jsonSchema: JsonSchema.toJsonSchema(TestCardSchema),
    });
    db.add(view);

    db.add(
      Obj.make(KanbanV1, {
        name: 'My Board',
        view: Ref.make(view),
        arrangement: { order: ['todo'], columns: { todo: { ids: [] } } },
      }),
    );
    await db.flush();

    await db.runMigrations([migration]);

    const results = await db.query(Filter.type(Kanban)).run();
    expect(results).toHaveLength(1);

    const migrated = results[0];
    expect(migrated.name).toBe('My Board');
    expect(migrated.arrangement.order).toEqual(['todo']);
    expect(migrated.spec.kind).toBe('view');
    if (migrated.spec.kind === 'view') {
      expect(migrated.spec.view.dxn.toString()).toBe(Ref.make(view).dxn.toString());
    }
    expect(Type.getVersion(Obj.getSchema(migrated)!)).toBe('0.2.0');
  });
});
