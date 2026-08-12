//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as Routine from '@dxos/compute/Routine';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Filter, Obj, Ref } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { AccessToken, Connection } from '@dxos/link';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import * as ConnectorOperation from '../types/ConnectorOperation';
import { scaffoldConnectionSyncRoutine } from './sync-routine';
import { findSyncTriggerForConnection } from './sync-trigger';

/** Stands in for a connector's declared `sync.trigger`. */
const SYNC_SPEC = Trigger.specTimer('*/10 * * * *');

const types = [Routine.Routine, Trigger.Trigger, AccessToken.AccessToken, Connection.Connection];

const initSpace = async (harness: Awaited<ReturnType<typeof createComposerTestApp>>) => {
  const { defaultSpace } = await EffectEx.runAndForwardErrors(
    initializeIdentity(harness.get(ClientCapabilities.Client)),
  );
  await harness.waitForEvent(ClientEvents.SpacesReady);
  return defaultSpace.db;
};

const makeConnection = (db: Database.Database): Connection.Connection => {
  const token = db.add(Obj.make(AccessToken.AccessToken, { source: 'example.com', token: 'tok' }));
  return db.add(
    Obj.make(Connection.Connection, { name: 'me@example.com', connectorId: 'example', accessToken: Ref.make(token) }),
  );
};

describe('scaffoldConnectionSyncRoutine', () => {
  test('scaffolds an account routine wrapping SyncConnection with a priority event template', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [ClientPlugin({ types })] });
    const db = await initSpace(harness);
    const connection = makeConnection(db);

    const draft = scaffoldConnectionSyncRoutine({ connection, spec: SYNC_SPEC });

    // Unpersisted draft: nothing lands in the database until the create-routine form saves it.
    expect(await db.query(Filter.type(Routine.Routine)).run()).toHaveLength(0);

    const trigger = draft.triggers[0]?.target;
    expect(Obj.instanceOf(Trigger.Trigger, trigger)).toBe(true);
    expect(trigger?.spec).toEqual({ kind: 'timer', cron: '*/10 * * * *' });
    expect(trigger?.enabled).toBe(true);
    // A connector that does not declare `sync.remote` gets a local trigger, with nothing stored.
    expect(trigger?.remote).toBeUndefined();
    // The trigger binds the whole account plus the pressed-first hint resolved from the fire event.
    expect(trigger?.input?.connection?.uri).toBe(Ref.make(connection).uri);
    expect(trigger?.input?.priority).toBe('{{event.data.priority}}');

    // The runnable is the statically-registered SyncConnection fan-out, referenced by key.
    expect(draft.spec?.kind === 'runnable' && draft.spec.runnable.uri).toBe(ConnectorOperation.SyncConnection.meta.key);

    // Labeled after the account so multiple connections stay distinguishable.
    expect(draft.name).toBe('Sync — me@example.com');
  });

  test('marks the trigger remote for a connector that syncs on EDGE', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [ClientPlugin({ types })] });
    const db = await initSpace(harness);
    const connection = makeConnection(db);

    const draft = scaffoldConnectionSyncRoutine({ connection, spec: SYNC_SPEC, remote: true });

    // The monitor routes a `remote` trigger to EDGE, so the schedule keeps running with the app closed.
    expect(draft.triggers[0]?.target?.remote).toBe(true);
  });

  test('a persisted draft is findable from the connection (the sync button’s lookup)', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [ClientPlugin({ types })] });
    const db = await initSpace(harness);
    const connection = makeConnection(db);

    const draft = scaffoldConnectionSyncRoutine({ connection, spec: SYNC_SPEC });
    const persisted = db.add(draft);
    await db.flush({ indexes: true });

    // The reverse-ref from the connection is how a sync finds this trigger to force-run.
    await expect
      .poll(
        () =>
          findSyncTriggerForConnection(connection)
            .pipe(Effect.provide(Database.layer(db)), EffectEx.runPromise)
            .then((trigger) => trigger?.id),
        { timeout: 5_000 },
      )
      .toBe(persisted.triggers[0]?.target?.id);
  });
});
