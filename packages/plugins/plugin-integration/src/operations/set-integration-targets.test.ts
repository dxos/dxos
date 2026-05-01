//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Database, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { runAndForwardErrors } from '@dxos/effect';
import { Expando } from '@dxos/schema';
import { AccessToken } from '@dxos/types';

import { Integration } from '../types';
import setIntegrationTargets from './set-integration-targets';

describe('SetIntegrationTargets', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  const setup = async () => {
    const { db, graph } = await builder.createDatabase();
    await graph.schemaRegistry.register([
      Integration.Integration,
      AccessToken.AccessToken,
      Expando.Expando,
    ]);
    const token = db.add(
      Obj.make(AccessToken.AccessToken, { source: 'example.com', token: 'tok', account: 'me' }),
    );
    return { db, token };
  };

  const invokeSet = (
    db: any,
    integration: Integration.Integration,
    selected: ReadonlyArray<{ remoteId: string; name?: string }>,
  ) =>
    setIntegrationTargets
      .handler({
        integration: Ref.make(integration),
        selected,
      })
      .pipe(Effect.provide(Database.layer(db)), runAndForwardErrors);

  test('appends remote-id selections not previously in targets', async ({ expect }) => {
    const { db, token } = await setup();
    const integration = db.add(
      Integration.make({ accessToken: Ref.make(token), targets: [] }),
    );

    const result = await invokeSet(db, integration, [{ remoteId: 'foo', name: 'Foo' }]);
    expect(result.added).toBe(1);
    expect(result.removed).toBe(0);
    expect(integration.targets.length).toBe(1);
    expect(integration.targets[0].remoteId).toBe('foo');
    expect(integration.targets[0].name).toBe('Foo');
    expect(integration.targets[0].object).toBeUndefined();
  });

  test('removes selections that drop out of the new submission', async ({ expect }) => {
    const { db, token } = await setup();
    const integration = db.add(
      Integration.make({
        accessToken: Ref.make(token),
        targets: [
          { remoteId: 'a', name: 'A' },
          { remoteId: 'b', name: 'B' },
        ],
      }),
    );

    const result = await invokeSet(db, integration, [{ remoteId: 'a', name: 'A' }]);
    expect(result.added).toBe(0);
    expect(result.removed).toBe(1);
    expect(integration.targets.length).toBe(1);
    expect(integration.targets[0].remoteId).toBe('a');
  });

  test('preserves cursor/lastSyncAt/object on already-present targets', async ({ expect }) => {
    const { db, token } = await setup();
    const obj = db.add(Obj.make(Expando.Expando, { name: 'kept' }));
    const lastSyncAt = '2026-04-01T00:00:00.000Z';
    const integration = db.add(
      Integration.make({
        accessToken: Ref.make(token),
        targets: [
          {
            remoteId: 'kept',
            name: 'Kept',
            object: Ref.make(obj),
            cursor: 'sentinel',
            lastSyncAt,
          },
        ],
      }),
    );

    const result = await invokeSet(db, integration, [{ remoteId: 'kept', name: 'Kept' }]);
    expect(result.added).toBe(0);
    expect(result.removed).toBe(0);
    expect(integration.targets.length).toBe(1);
    expect(integration.targets[0].cursor).toBe('sentinel');
    expect(integration.targets[0].lastSyncAt).toBe(lastSyncAt);
    expect(integration.targets[0].object?.dxn.asEchoDXN()?.echoId).toBe(
      Ref.make(obj).dxn.asEchoDXN()?.echoId,
    );
  });

  test('leaves auto-created targets (no remoteId) untouched on submit', async ({ expect }) => {
    const { db, token } = await setup();
    // Auto-created at OAuth time (e.g. Gmail's single Mailbox): has `object`
    // but no `remoteId`, and the dialog has no row for it. Submitting a
    // selection of remote-id targets must not delete it.
    const auto = db.add(Obj.make(Expando.Expando, { name: 'auto' }));
    const integration = db.add(
      Integration.make({
        accessToken: Ref.make(token),
        targets: [{ object: Ref.make(auto) }],
      }),
    );

    const result = await invokeSet(db, integration, [{ remoteId: 'new', name: 'New' }]);
    expect(result.added).toBe(1);
    expect(result.removed).toBe(0);
    expect(integration.targets.length).toBe(2);
    expect(integration.targets.find((t) => t.remoteId === undefined)?.object).toBeDefined();
    expect(integration.targets.find((t) => t.remoteId === 'new')).toBeDefined();
  });
});
