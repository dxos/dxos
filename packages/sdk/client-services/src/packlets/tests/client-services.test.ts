//
// Copyright 2020 DXOS.org
//

import { expect } from 'chai';
import assert from 'node:assert';
import waitForExpect from 'wait-for-expect';

import { Trigger } from '@dxos/async';
import { Client, Space } from '@dxos/client';
import { raise } from '@dxos/debug';
import { log } from '@dxos/log';
import { Invitation, SpaceMember } from '@dxos/protocols/proto/dxos/client/services';
import { describe, test, afterTest } from '@dxos/test';

import { syncItems, TestBuilder } from '../testing';

// TODO(burdon): Use as set-up for test suite.
// TODO(burdon): Timeouts and progress callback/events.

describe('Client services', () => {
  test('creates client with local host', async () => {
    const testBuilder = new TestBuilder();

    const servicesProvider = testBuilder.createLocal();
    await servicesProvider.open();
    afterTest(() => servicesProvider.close());

    const client = new Client({ services: servicesProvider });
    await client.initialize();
    afterTest(() => client.destroy());
    expect(client.initialized).to.be.true;
  });

  test('creates client with remote server', async () => {
    const testBuilder = new TestBuilder();

    const peer = testBuilder.createClientServicesHost();
    await peer.open();
    afterTest(() => peer.close());

    const [client, server] = testBuilder.createClientServer(peer);
    void server.open();
    afterTest(() => server.close());

    await client.initialize();
    afterTest(() => client.destroy());
    expect(client.initialized).to.be.true;
  });

  test('creates clients with multiple peers connected via memory transport', async () => {
    const testBuilder = new TestBuilder();

    {
      const peer1 = testBuilder.createClientServicesHost();
      await peer1.open();
      afterTest(() => peer1.close());

      {
        const [client1a, server1a] = testBuilder.createClientServer(peer1);
        void server1a.open();
        await client1a.initialize();
        afterTest(() => Promise.all([client1a.destroy(), server1a.close()]));
        expect(client1a.initialized).to.be.true;

        await client1a.halo.createIdentity();
      }
      {
        const [client1b, server1b] = testBuilder.createClientServer(peer1);
        void server1b.open();
        await client1b.initialize();
        afterTest(() => Promise.all([client1b.destroy(), server1b.close()]));
        expect(client1b.initialized).to.be.true;

        // TODO(burdon): Test profile is available.
      }
    }

    {
      const peer2 = testBuilder.createClientServicesHost();
      await peer2.open();
      afterTest(() => peer2.close());

      {
        const [client2a, server2a] = testBuilder.createClientServer(peer2);
        void server2a.open();
        await client2a.initialize();
        afterTest(() => Promise.all([client2a.destroy(), server2a.close()]));
        expect(client2a.initialized).to.be.true;

        await client2a.halo.createIdentity();
      }
    }
  });

  test('creates identity and invites peer', async () => {
    const testBuilder = new TestBuilder();

    const peer1 = testBuilder.createClientServicesHost();
    const peer2 = testBuilder.createClientServicesHost();

    await peer1.open();
    await peer2.open();

    const [client1, server1] = testBuilder.createClientServer(peer1);
    const [client2, server2] = testBuilder.createClientServer(peer2);

    // Don't wait (otherwise will block).
    {
      void server1.open();
      void server2.open();

      await client1.initialize();
      await client2.initialize();

      await client1.halo.createIdentity();
    }

    const success1 = new Trigger<Invitation>();
    const success2 = new Trigger<Invitation>();

    const authenticationCode = new Trigger<string>();

    {
      const observable1 = client1.halo.createInvitation();
      observable1.subscribe(
        (invitation1) => {
          switch (invitation1.state) {
            case Invitation.State.CONNECTING: {
              const observable2 = client2.halo.acceptInvitation(invitation1);
              observable2.subscribe(
                async (invitation2) => {
                  switch (invitation2.state) {
                    case Invitation.State.AUTHENTICATING: {
                      await observable2.authenticate(await authenticationCode.wait());
                      break;
                    }

                    case Invitation.State.SUCCESS: {
                      // TODO(burdon): No device.
                      // expect(guest.identityManager.identity!.authorizedDeviceKeys.size).to.eq(1);
                      success2.wake(invitation2);
                      break;
                    }
                  }
                },
                (err) => raise(err)
              );
              break;
            }

            case Invitation.State.CONNECTED: {
              assert(invitation1.authenticationCode);
              authenticationCode.wake(invitation1.authenticationCode);
              break;
            }

            case Invitation.State.SUCCESS: {
              success1.wake(invitation1);
              break;
            }
          }
        },
        (err) => raise(err)
      );
    }

    // Check same identity.
    const [invitation1, invitation2] = await Promise.all([success1.wait(), success2.wait()]);
    expect(invitation1.identityKey).not.to.exist;
    expect(invitation2.identityKey).to.deep.eq(client1.halo.identity.get()!.identityKey);
    expect(invitation2.identityKey).to.deep.eq(client2.halo.identity.get()!.identityKey);
    expect(invitation1.state).to.eq(Invitation.State.SUCCESS);
    expect(invitation2.state).to.eq(Invitation.State.SUCCESS);

    // Check devices.
    // TODO(burdon): Incorrect number of devices.
    await waitForExpect(async () => {
      expect(client1.halo.devices.get()).to.have.lengthOf(2);
      expect(client2.halo.devices.get()).to.have.lengthOf(2);
    });
  });

  test('synchronizes data between two spaces after completing invitation', async () => {
    const testBuilder = new TestBuilder();

    const peer1 = testBuilder.createClientServicesHost();
    const peer2 = testBuilder.createClientServicesHost();

    await peer1.open();
    await peer2.open();

    const [client1, server1] = testBuilder.createClientServer(peer1);
    const [client2, server2] = testBuilder.createClientServer(peer2);

    // Don't wait (otherwise will block).
    {
      void server1.open();
      void server2.open();

      await client1.initialize();
      await client2.initialize();
      await client1.halo.createIdentity({ displayName: 'Peer 1' });
      await client2.halo.createIdentity({ displayName: 'Peer 2' });
    }
    log('initialized');

    afterTest(() => Promise.all([client1.destroy(), server1.close(), peer1.close()]));
    afterTest(() => Promise.all([client2.destroy(), server2.close(), peer2.close()]));

    const success1 = new Trigger<Invitation>();
    const success2 = new Trigger<Invitation>();

    const space1 = await client1.createSpace();
    log('createSpace', { key: space1.key });
    const observable1 = space1.createInvitation({ type: Invitation.Type.INTERACTIVE_TESTING });
    observable1.subscribe(
      (invitation1) => {
        switch (invitation1.state) {
          case Invitation.State.CONNECTING: {
            const observable2 = client2.acceptInvitation(invitation1);
            observable2.subscribe(
              (invitation2) => {
                switch (invitation2.state) {
                  case Invitation.State.SUCCESS: {
                    success2.wake(invitation2);
                  }
                }
              },
              (err) => raise(err)
            );
            break;
          }

          case Invitation.State.SUCCESS: {
            log('onSuccess');
            success1.wake(invitation1);
            break;
          }
        }
      },
      (err) => raise(err)
    );
    const [invitation1, invitation2] = await Promise.all([success1.wait(), success2.wait()]);
    expect(invitation1.spaceKey).to.deep.eq(invitation2.spaceKey);
    expect(invitation1.state).to.eq(Invitation.State.SUCCESS);

    log('Invitation complete');

    // TODO(burdon): Space should now be available?
    const trigger = new Trigger<Space>();
    await waitForExpect(() => {
      const space2 = client2.getSpace(invitation2.spaceKey!);
      assert(space2);
      expect(space2).to.exist;
      trigger.wake(space2);
    });

    const space2 = await trigger.wait();

    for (const space of [space1, space2]) {
      await waitForExpect(() => {
        expect(space.members.get()).to.deep.equal([
          {
            identity: {
              identityKey: client1.halo.identity.get()!.identityKey,
              profile: {
                displayName: 'Peer 1'
              }
            },
            presence: SpaceMember.PresenceState.ONLINE
          },
          {
            identity: {
              identityKey: client2.halo.identity.get()!.identityKey,
              profile: {
                displayName: 'Peer 2'
              }
            },
            presence: SpaceMember.PresenceState.ONLINE
          }
        ]);
      }, 3_000);
    }

    await syncItems(space1.internal.db, space2.internal.db);
  });
});
