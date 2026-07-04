//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { Expando } from '@dxos/schema';
import { AccessToken, Cursor } from '@dxos/types';

import { migrations } from './migrations';
import { Connection, SyncBinding } from '../types';

describe('SyncBinding migrations', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  test('0.1.0 → 0.2.0 preserves the binding and attaches a fresh cursor', async ({ expect }) => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([
      AccessToken.AccessToken,
      Connection.Connection,
      Cursor.Cursor,
      SyncBinding.SyncBinding,
      SyncBinding.SyncBindingV1,
      Expando.Expando,
    ]);

    const token = db.add(Obj.make(AccessToken.AccessToken, { source: 'example.com', token: 'tok' }));
    const connection = db.add(
      Obj.make(Connection.Connection, { connectorId: 'example', accessToken: Ref.make(token) }),
    );
    const target = db.add(Obj.make(Expando.Expando, { name: 'board' }));

    // A legacy binding with the inline cursor/status fields.
    const legacy = db.add(
      Relation.make(SyncBinding.SyncBindingV1, {
        [Relation.Source]: connection,
        [Relation.Target]: target,
        remoteId: 'board-1',
        name: 'Board',
        cursor: 'old-high-water',
        lastSyncAt: '2026-01-01T00:00:00.000Z',
        lastError: 'stale error',
        options: { includeArchived: true },
      }),
    );
    await db.flush({ indexes: true });

    await db.runMigrations(migrations);

    // The binding is now 0.2.0 (same id, endpoints, remoteId/name/options preserved).
    const bindings = await db.query(Query.select(Filter.type(SyncBinding.SyncBinding))).run();
    expect(bindings).toHaveLength(1);
    const migrated = bindings[0];
    expect(migrated.id).toBe(legacy.id);
    expect(migrated.remoteId).toBe('board-1');
    expect(migrated.name).toBe('Board');
    expect(migrated.options).toEqual({ includeArchived: true });
    expect(Relation.getTarget(migrated).id).toBe(target.id);
    expect(Relation.getSource(migrated).id).toBe(connection.id);

    // The cursor is a fresh empty Cursor object owned by the binding (the old inline
    // cursor/lastSyncAt/lastError fields no longer exist on the 0.2.0 schema).
    const cursors = await db.query(Query.select(Filter.type(Cursor.Cursor))).run();
    expect(cursors).toHaveLength(1);
    const cursor = cursors[0];
    expect(cursor.value).toBeUndefined();
    expect(migrated.cursor.target?.id).toBe(cursor.id);
    expect(Obj.getParent(cursor)?.id).toBe(migrated.id);

    // No legacy (0.1.0) bindings remain.
    const legacyBindings = await db.query(Query.select(Filter.type(SyncBinding.SyncBindingV1))).run();
    expect(legacyBindings).toHaveLength(0);
  });
});
