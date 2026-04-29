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

  const invokeSet = (db: any, integration: Integration.Integration, refs: Array<Ref.Ref<Obj.Unknown>>) =>
    setIntegrationTargets
      .handler({
        integration: Ref.make(integration),
        selectedRefs: refs,
      })
      .pipe(Effect.provide(Database.layer(db)), runAndForwardErrors);

  test('appends refs not previously in targets', async ({ expect }) => {
    const { db, token } = await setup();
    const integration = db.add(
      Integration.make({ accessToken: Ref.make(token), targets: [] }),
    );
    const obj = db.add(Obj.make(Expando.Expando, { name: 'foo' }));

    const result = await invokeSet(db, integration, [Ref.make(obj)]);
    expect(result.added).toBe(1);
    expect(result.removed).toBe(0);
    expect(integration.targets.length).toBe(1);
    expect(integration.targets[0].object.dxn.toString()).toBe(Ref.make(obj).dxn.toString());
  });

  test('removes refs that drop out of the new selection', async ({ expect }) => {
    const { db, token } = await setup();
    const obj1 = db.add(Obj.make(Expando.Expando, { name: 'a' }));
    const obj2 = db.add(Obj.make(Expando.Expando, { name: 'b' }));
    const integration = db.add(
      Integration.make({
        accessToken: Ref.make(token),
        targets: [{ object: Ref.make(obj1) }, { object: Ref.make(obj2) }],
      }),
    );

    const result = await invokeSet(db, integration, [Ref.make(obj1)]);
    expect(result.added).toBe(0);
    expect(result.removed).toBe(1);
    expect(integration.targets.length).toBe(1);
    expect(integration.targets[0].object.dxn.toString()).toBe(Ref.make(obj1).dxn.toString());
  });

  test('preserves cursor/lastSyncAt on already-present targets', async ({ expect }) => {
    const { db, token } = await setup();
    const obj = db.add(Obj.make(Expando.Expando, { name: 'kept' }));
    const lastSyncAt = '2026-04-01T00:00:00.000Z';
    const integration = db.add(
      Integration.make({
        accessToken: Ref.make(token),
        targets: [{ object: Ref.make(obj), cursor: 'sentinel', lastSyncAt }],
      }),
    );

    const result = await invokeSet(db, integration, [Ref.make(obj)]);
    expect(result.added).toBe(0);
    expect(result.removed).toBe(0);
    expect(integration.targets.length).toBe(1);
    expect(integration.targets[0].cursor).toBe('sentinel');
    expect(integration.targets[0].lastSyncAt).toBe(lastSyncAt);
  });
});
