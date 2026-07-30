//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Operation, Routine, Trigger } from '@dxos/compute';
import { Database, DXN, Obj, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { AccessToken, Cursor } from '@dxos/link';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { connectedRoutinesQuery } from '@dxos/plugin-routine';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { Expando } from '@dxos/schema';

import { createSyncRoutine } from './sync-routine';
import { findSyncTriggerForBinding } from './sync-trigger';

/** Stands in for a connector's declared `sync.trigger`. */
const SYNC_SPEC = Trigger.specTimer('*/10 * * * *');

// Stand-in for a connector's `sync.operation` (e.g. `InboxOperation.GoogleMailSync`): takes the same
// `{ binding: Ref<Cursor> }` shape every real connector's sync declares.
const TestSync = Operation.make({
  meta: { key: DXN.make('org.dxos.test.sync'), name: 'Test Sync' },
  input: Schema.Struct({ binding: Ref.Ref(Cursor.Cursor) }),
  output: Schema.Any,
});

const types = [
  Routine.Routine,
  Trigger.Trigger,
  Operation.PersistentOperation,
  AccessToken.AccessToken,
  Cursor.Cursor,
  Expando.Expando,
];

const initSpace = async (harness: Awaited<ReturnType<typeof createComposerTestApp>>) => {
  const { personalSpace } = await EffectEx.runAndForwardErrors(
    initializeIdentity(harness.get(ClientCapabilities.Client)),
  );
  await harness.waitForEvent(ClientEvents.SpacesReady);
  return personalSpace.db;
};

/** Persists an external-sync cursor targeting `target`, standing in for a connector-created binding. */
const makeCursor = (db: Database.Database, target: Obj.Unknown): Cursor.ExternalCursor => {
  const accessToken = db.add(Obj.make(AccessToken.AccessToken, { source: 'example.com', token: 'tok' }));
  const cursor = db.add(Cursor.makeExternal({ source: Ref.make(accessToken), target: Ref.make(target) }));
  invariant(Cursor.isExternal(cursor));
  return cursor;
};

const findSyncRoutine = (db: Database.Database, target: Obj.Unknown) =>
  db
    .query(connectedRoutinesQuery(target))
    .run()
    .then((routines) =>
      routines.filter((routine) => routine.triggers.some((ref) => ref.target?.spec?.kind === 'timer')),
    );

describe('createSyncRoutine', () => {
  test('creates a routine with a timer trigger bound to the target’s cursor', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [ClientPlugin({ types })] });
    const db = await initSpace(harness);

    const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
    const cursor = makeCursor(db, target);
    const created = await createSyncRoutine({ target, cursor, operation: TestSync, spec: SYNC_SPEC }).pipe(
      Effect.provide(Database.layer(db)),
      EffectEx.runPromise,
    );
    await db.flush();

    await expect.poll(() => findSyncRoutine(db, target), { timeout: 5_000 }).toHaveLength(1);
    const [routine] = await findSyncRoutine(db, target);
    const [triggerRef] = routine.triggers;
    const trigger = triggerRef.target;
    expect(trigger?.spec).toEqual({ kind: 'timer', cron: '*/10 * * * *' });
    expect(trigger?.enabled).toBe(true);
    // `input` carries only `binding` (matching the sync operation's input schema); the target is reached
    // through the binding cursor's `spec.target`, not smuggled in as an extra input key.
    expect(Object.keys(trigger?.input ?? {})).toEqual(['binding']);
    expect(trigger?.input?.binding?.uri).toBe(Ref.make(cursor).uri);
    expect(created?.id).toBe(trigger?.id);

    // The reverse-ref from the cursor is how a manual sync finds this trigger to force-run.
    const found = await findSyncTriggerForBinding(cursor).pipe(Effect.provide(Database.layer(db)), EffectEx.runPromise);
    expect(found?.id).toBe(trigger?.id);
  });

  test('is idempotent: a second call is a no-op once a sync routine is connected', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [ClientPlugin({ types })] });
    const db = await initSpace(harness);

    const target = db.add(Obj.make(Expando.Expando, { name: 'Inbox' }));
    const cursor = makeCursor(db, target);
    const run = () =>
      createSyncRoutine({ target, cursor, operation: TestSync, spec: SYNC_SPEC }).pipe(
        Effect.provide(Database.layer(db)),
        EffectEx.runPromise,
      );
    const first = await run();
    await db.flush();
    await expect.poll(() => findSyncRoutine(db, target), { timeout: 5_000 }).toHaveLength(1);

    const second = await run();
    await db.flush();

    expect(await findSyncRoutine(db, target)).toHaveLength(1);
    // The second call returns the same, pre-existing trigger rather than creating another.
    expect(second?.id).toBe(first?.id);
  });
});
