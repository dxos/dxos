//
// Copyright 2026 DXOS.org
//

import * as Stream from 'effect/Stream';
import { describe, onTestFinished, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';
import { SpaceMember_Role } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { Client } from '../client/index.ts';
import { TestBuilder } from '../testing/index.ts';

describe('Halo inbox', () => {
  test('is served by the stack, and without EDGE is empty and refuses to send', async ({ expect }) => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());
    const client = new Client({ services: testBuilder.createLocalClientServices() });
    await client.initialize();
    onTestFinished(() => client.destroy());
    await client.halo.createIdentity();

    const [snapshot] = await EffectEx.runPromise(
      client.services.rpc['InboxService.subscribe'](undefined).pipe(Stream.take(1), Stream.runCollect),
    );
    expect(snapshot.notices).toEqual([]);
    expect(client.halo.inbox.notices.get()).toEqual([]);

    await expect(
      client.halo.inbox.send({
        recipientIdentityKey: PublicKey.random(),
        spaceKey: PublicKey.random(),
        role: SpaceMember_Role.EDITOR,
      }),
    ).rejects.toThrow();
  });
});
