//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Operation } from '@dxos/compute';
import { type Database, DXN, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';
import { AccessToken, Cursor } from '@dxos/link';

import { Connection, type ConnectorEntry, ConnectorOperation } from '#types';

import { AUTO_SYNC_ON_CONNECTION_SETUP } from '../../constants';
import { autoSyncConnection } from './auto-sync';

describe('autoSyncConnection', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  // Stand-in provider sync; never invoked directly, its presence is what makes a connector syncable.
  const SyncExampleTarget = Operation.make({
    meta: { key: DXN.make('org.dxos.test.autoSync.sync') },
    input: Schema.Struct({ binding: Ref.Ref(Cursor.Cursor) }),
    output: Schema.Any,
  });

  /**
   * Records which operations the helper invokes. A real invoker would have to supply the
   * `Capability.Service` that `SyncConnection` declares, and the cursor fan-out is covered by that
   * operation's own tests — all this asserts is which operation the setup flow reaches for. `invoke`
   * dies instead of returning an output: the helper catches defects, and a typed stub can't conjure
   * an arbitrary operation output without a cast.
   */
  const makeRecordingInvoker = () => {
    const invoked: DXN.DXN[] = [];
    let onInvoke: (() => void) | undefined;
    const invoker: Operation.OperationService = {
      invoke: (op, ..._args) => {
        invoked.push(op.meta.key);
        onInvoke?.();
        return Effect.die('recording invoker: invoke is not implemented.');
      },
      schedule: () => Effect.void,
      invokePromise: () => Promise.resolve({}),
    };
    const nextInvocation = () => new Promise<void>((resolve) => (onInvoke = resolve));
    return { invoker, invoked, nextInvocation };
  };

  const makeConnector = (overrides: Partial<ConnectorEntry> = {}): ConnectorEntry => ({
    id: 'example',
    source: 'example.com',
    sync: SyncExampleTarget,
    ...overrides,
  });

  const setup = async (): Promise<{ db: Database.Database; connection: Connection.Connection }> => {
    const { db, graph } = await builder.createDatabase();
    graph.registry.add([Connection.Connection, Cursor.Cursor, AccessToken.AccessToken]);
    const token = db.add(Obj.make(AccessToken.AccessToken, { source: 'example.com', token: 'tok' }));
    const connection = db.add(
      Obj.make(Connection.Connection, { connectorId: 'example', accessToken: Ref.make(token) }),
    );
    return { db, connection };
  };

  test('does nothing for a connector without a sync operation', async ({ expect }) => {
    const { db, connection } = await setup();
    const { invoker, invoked } = makeRecordingInvoker();

    await EffectEx.runPromise(autoSyncConnection(invoker, db, makeConnector({ sync: undefined }), connection));

    expect(invoked).toEqual([]);
  });

  test.runIf(AUTO_SYNC_ON_CONNECTION_SETUP)('syncs the connection when the flag is on', async ({ expect }) => {
    const { db, connection } = await setup();
    const { invoker, invoked, nextInvocation } = makeRecordingInvoker();

    const invocation = nextInvocation();
    await EffectEx.runPromise(autoSyncConnection(invoker, db, makeConnector(), connection));
    // The sync is forked, so it lands after the helper's own effect has completed.
    await invocation;

    expect(invoked).toEqual([ConnectorOperation.SyncConnection.meta.key]);
  });

  test.runIf(!AUTO_SYNC_ON_CONNECTION_SETUP)('does nothing when the flag is off', async ({ expect }) => {
    const { db, connection } = await setup();
    const { invoker, invoked } = makeRecordingInvoker();

    await EffectEx.runPromise(autoSyncConnection(invoker, db, makeConnector(), connection));

    expect(invoked).toEqual([]);
  });
});
