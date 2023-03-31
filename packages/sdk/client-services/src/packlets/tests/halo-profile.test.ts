//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { Client } from '@dxos/client';
import { raise } from '@dxos/debug';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { describe, test, afterTest } from '@dxos/test';

import { TestBuilder } from '../testing';

describe('Halo', () => {
  test('creates a identity', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({ services: testBuilder.createLocal() });
    afterTest(() => client.destroy());
    await client.initialize();

    await client.halo.createIdentity({ displayName: 'test-user' });
    expect(client.halo.identity).exist;

    expect(await client.halo.devices.get()).to.have.lengthOf(1);
    expect(client.halo.identity.get()!.profile?.displayName).to.equal('test-user');
  });

  test('device invitations', async () => {
    const testBuilder = new TestBuilder();

    const client1 = new Client({ services: testBuilder.createLocal() });
    afterTest(() => client1.destroy());
    await client1.initialize();

    await client1.halo.createIdentity({ displayName: 'test-user' });
    expect(client1.halo.identity).exist;

    expect(await client1.halo.devices.get()).to.have.lengthOf(1);

    const client2 = new Client({ services: testBuilder.createLocal() });
    afterTest(() => client2.destroy());
    await client2.initialize();

    const done1 = new Trigger();
    const done2 = new Trigger();
    const observable1 = client1.halo.createInvitation({ type: Invitation.Type.INTERACTIVE_TESTING });
    observable1.subscribe(
      (invitation1) => {
        switch (invitation1.state) {
          case Invitation.State.CONNECTING: {
            const observable2 = client2.halo.acceptInvitation(invitation1, {
              type: Invitation.Type.INTERACTIVE_TESTING
            });
            observable2.subscribe(
              (invitation2) => {
                switch (invitation2.state) {
                  case Invitation.State.SUCCESS: {
                    done2.wake();
                  }
                }
              },
              (err) => raise(err)
            );
            break;
          }

          case Invitation.State.SUCCESS: {
            done1.wake();
            break;
          }
        }
      },
      (err) => raise(err)
    );

    await done1.wait();
    await done2.wait();

    expect(await client1.halo.devices.get()).to.have.lengthOf(2);
    expect(await client2.halo.devices.get()).to.have.lengthOf(2);
  });
});
