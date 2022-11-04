//
// Copyright 2020 DXOS.org
//

// @dxos/mocha platform=nodejs

import expect from 'expect';
import assert from 'node:assert';
import waitForExpect from 'wait-for-expect';

import { sleep, waitForCondition } from '@dxos/async';
import { ClientServicesHost, InvitationWrapper } from '@dxos/client-services';
import { Config } from '@dxos/config';
import { generateSeedPhrase, keyPairFromSeedPhrase } from '@dxos/credentials';
import { throwUnhandledRejection } from '@dxos/debug';
import { log } from '@dxos/log';
import { MemorySignalManager, MemorySignalManagerContext } from '@dxos/messaging';
import { TestModel } from '@dxos/model-factory';
import { MemoryTransportFactory, NetworkManager } from '@dxos/network-manager';
import { ObjectModel } from '@dxos/object-model';
import { Config as ConfigProto, Runtime } from '@dxos/protocols/proto/dxos/config';
import { createBundledRpcServer, createLinkedPorts, createProtoRpcPeer } from '@dxos/rpc';
import { afterTest } from '@dxos/testutils';
import { TextModel } from '@dxos/text-model';
import { Timeframe } from '@dxos/timeframe';

import { Client } from './packlets/proxies';

describe('Client', function () {
  //
  // Suite is called for local and remote client configurations.
  //
  const testSuite = (createClient: () => Promise<Client>) => {
    describe('initialization', function () {
      // TODO(wittjosiah): Review timeout.
      it.only('initialize and destroy', async function () {
        const client = await createClient();
        await client.initialize();
        await client.destroy();
      }).timeout(500);

      it('initialize and destroy are idempotent', async function () {
        const client = await createClient();
        await client.initialize();
        await client.initialize();
        expect(client.initialized).toBeTruthy();

        await client.destroy();
        await client.destroy();
        expect(client.initialized).toBeFalsy();
      });
    });

    describe('profile', function () {
      it('creates a profile', async function () {
        const client = await createClient();

        await client.initialize();
        afterTest(() => client.destroy());

        const profile = await client.halo.createProfile({ username: 'test-user' });
        expect(profile).toBeDefined();
        // expect(profile?.username).toEqual('test-user');
        expect(client.halo.profile).toBeDefined();
      }).timeout(500);

      it('creating profile twice throws an error', async function () {
        const client = await createClient();
        await client.initialize();
        afterTest(() => client.destroy());

        await client.halo.createProfile({ username: 'test-user' });
        expect(!!client.halo.profile).toBeTruthy();

        await expect(client.halo.createProfile({ username: 'test-user' })).rejects.toThrow();
        expect(!!client.halo.profile).toBeTruthy();
      });

      it.skip('Recovers a profile with a seed phrase', async function () {
        const client = await createClient();
        await client.initialize();
        afterTest(() => client.destroy());

        const seedPhrase = generateSeedPhrase();
        const keyPair = keyPairFromSeedPhrase(seedPhrase);

        const profile = await client.halo.createProfile({ ...keyPair, username: 'test-user' });
        expect(profile).toBeDefined();
        expect(profile?.username).toEqual('test-user');
        expect(client.halo.profile).toBeDefined();

        const recoveredClient = await createClient();
        await recoveredClient.initialize();
        afterTest(() => recoveredClient.destroy());

        await recoveredClient.halo.recoverProfile(seedPhrase);
        await waitForCondition(() => !!recoveredClient.halo.profile, 2000);

        expect(recoveredClient.halo.profile).toBeDefined();
        expect(recoveredClient.halo.profile!.publicKey).toEqual(client.halo.profile!.publicKey);
        expect(recoveredClient.halo.profile!.username).toEqual('test-user');
      }).timeout(2000);
    });

    //
    // TODO(burdon): Factor out invitation tests.
    //

    describe('party invitations', function () {
      const prepareInvitations = async () => {
        const inviter = await createClient();
        await inviter.initialize();
        afterTest(() => inviter.destroy());

        const invitee = await createClient();
        await invitee.initialize();
        afterTest(() => invitee.destroy());

        await inviter.halo.createProfile({ username: 'inviter' });
        await invitee.halo.createProfile({ username: 'invitee' });

        return { inviter, invitee };
      };

      it('creates and joins a Party invitation', async function () {
        const { inviter, invitee } = await prepareInvitations();

        const party = await inviter.echo.createParty();
        const invitation = await party.createInvitation();
        invitation.error.on(throwUnhandledRejection);
        log('created invitation', { invitation: invitation.descriptor });

        const inviteeParty = await invitee.echo.acceptInvitation(invitation.descriptor).getParty();
        expect(inviteeParty.key).toEqual(party.key);

        // const members = party.queryMembers().value;
        // expect(members.length).toEqual(2);
      }).timeout(5000);

      it.skip('invitation callbacks are fired', async function () {
        const { inviter, invitee } = await prepareInvitations();

        const party = await inviter.echo.createParty();
        const invitation = await party.createInvitation();
        log('created invitation', { invitation: invitation.descriptor });

        const connectedFired = invitation.connected.waitForCount(1);
        // Simulate invitation being serialized. This effectively removes the pin from the invitation.
        const reencodedDescriptor = InvitationWrapper.fromQueryParameters(invitation.descriptor.toQueryParameters());
        const acceptedInvitation = invitee.echo.acceptInvitation(reencodedDescriptor);
        await connectedFired;

        const finishedFired = invitation.finished.waitForCount(1);
        acceptedInvitation.authenticate(invitation.secret);
        await finishedFired;

        const inviteeParty = await acceptedInvitation.getParty();
        expect(inviteeParty.key).toEqual(party.key);
      }).timeout(5000);

      it.skip('creates and joins an offline Party invitation', async function () {
        const { inviter, invitee } = await prepareInvitations();

        const party = await inviter.echo.createParty();
        assert(invitee.halo.profile);
        const invitation = await party.createInvitation({
          inviteeKey: invitee.halo.profile.publicKey
        });
        expect(invitation.descriptor.secret).toBeUndefined();
        invitation.error.on(throwUnhandledRejection);
        const inviteeParty = await invitee.echo.acceptInvitation(invitation.descriptor).getParty();

        expect(inviteeParty.key).toEqual(party.key);

        const members = party.queryMembers().value;
        expect(members.length).toEqual(2);
      }).timeout(5000);

      it.skip('creates and joins more than 1 Party', async function () {
        const { inviter, invitee } = await prepareInvitations();

        for (let i = 0; i < 3; i++) {
          const party = await inviter.echo.createParty();
          const invitation = await party.createInvitation();
          invitation.error.on(throwUnhandledRejection);
          const inviteeParty = await invitee.echo.acceptInvitation(invitation.descriptor).getParty();

          expect(inviteeParty.key).toEqual(party.key);
        }
      }).timeout(5000);
    });

    describe('HALO invitations', function () {
      const prepareInvitations = async () => {
        const inviter = await createClient();
        await inviter.initialize();
        afterTest(() => inviter.destroy());

        const invitee = await createClient();
        await invitee.initialize();
        afterTest(() => invitee.destroy());

        await inviter.halo.createProfile({ username: 'inviter' });
        expect(inviter.halo.profile).not.toBeUndefined();

        return { inviter, invitee };
      };

      it('creates and joins a HALO invitation', async function () {
        const { inviter, invitee } = await prepareInvitations();
        expect(invitee.halo.profile).toBeUndefined();

        const invitation = await inviter.halo.createInvitation();
        invitation.error.on(throwUnhandledRejection);
        await invitee.halo.acceptInvitation(invitation.descriptor).wait();

        expect(invitee.halo.profile).not.toBeUndefined();
      }).timeout(5000);

      it.skip('DXNS Account is synced between devices', async function () {
        const { inviter, invitee } = await prepareInvitations();

        const DXNSAccount = 'd3abd23e3f36a61a9e5d58e4b6286f89649594eedbd096b3a6e256ca1fe4c147';
        await inviter.halo.setGlobalPreference('DXNSAccount', DXNSAccount);

        const invitation = await inviter.halo.createInvitation();
        await invitee.halo.acceptInvitation(invitation.descriptor).wait();

        await waitForExpect(async () => {
          expect(await invitee.halo.getGlobalPreference('DXNSAccount')).toEqual(DXNSAccount);
        });

        // The preference can be changed and synced back.
        await invitee.halo.setGlobalPreference('DXNSAccount', '123');
        await waitForExpect(
          async () => {
            expect(await inviter.halo.getGlobalPreference('DXNSAccount')).toEqual('123');
          },
          10_000,
          100
        );
      }).timeout(10_000);
    });

    describe('data', function () {
      it('create and list parties', async function () {
        const client = await createClient();
        await client.initialize();
        afterTest(() => client.destroy());

        await client.halo.createProfile();
        const party = await client.echo.createParty();

        const parties = client.echo.queryParties().value;

        expect(parties).toEqual([party]);
      });

      it('create party and item', async function () {
        const client = await createClient();
        await client.initialize();
        afterTest(() => client.destroy());

        await client.halo.createProfile();
        const party = await client.echo.createParty();

        const item = await party.database.createItem({ model: ObjectModel });
        await item.model.set('foo', 'bar');

        expect(item.model.get('foo')).toEqual('bar');
      });

      it.skip('set party properties', async function () {
        const client = await createClient();
        await client.initialize();
        afterTest(() => client.destroy());

        await client.halo.createProfile();
        const party = await client.echo.createParty();

        await party.setTitle('test-party');
        const title = party.getProperty('title');
        expect(title).toEqual('test-party');
      });

      it.skip('Properly creates multiple items in a party', async function () {
        const client = await createClient();
        await client.initialize();
        afterTest(() => client.destroy());

        await client.halo.createProfile();
        const party = await client.echo.createParty();

        const item1 = await party.database.createItem({
          model: ObjectModel,
          type: 'test'
        });
        await item1.model.set('prop1', 'x');
        const item2 = await party.database.createItem({
          model: ObjectModel,
          type: 'test'
        });
        await item2.model.set('prop1', 'y');

        expect(item1.model.get('prop1')).toEqual('x');
      });

      it.skip('party timeframe is incremented after creating ECHO mutations', async function () {
        const client = await createClient();
        await client.initialize();
        afterTest(() => client.destroy());

        await client.halo.createProfile();
        const party = await client.echo.createParty();

        const item1 = await party.database.createItem({
          model: ObjectModel,
          type: 'test'
        });
        await item1.model.set('prop1', 'x');
        const item2 = await party.database.createItem({
          model: ObjectModel,
          type: 'test'
        });
        await item2.model.set('prop1', 'y');

        const details = await party.getDetails();
        expect(details.processedTimeframe).toBeInstanceOf(Timeframe);
        expect(details.processedTimeframe.frames().some(([key, seq]) => seq > 0)).toBe(true);
      });

      it('registering a custom model', async function () {
        const client = await createClient();
        await client.initialize();
        afterTest(() => client.destroy());

        await client.halo.createProfile();

        client.echo.registerModel(TextModel);
        const party = await client.echo.createParty();
        const item = await party.database.createItem({ model: TextModel });
        item.model.insert('Hello World', 0);
        expect(item.model.textContent).toEqual('Hello World');
      });
    });
  };

  describe('local', function () {
    testSuite(
      async () =>
        new Client({
          runtime: {
            client: {
              mode: Runtime.Client.Mode.LOCAL
            }
          }
        })
    );
  });

  describe('remote', function () {
    testSuite(async () => {
      const [proxyPort, hostPort] = createLinkedPorts();

      const hostClient = new Client();
      await hostClient.initialize();
      afterTest(() => hostClient.destroy());

      // TODO(burdon): Factor out with client.initializeRemote
      const servicesHost = (hostClient as any)._clientServices;
      const server = createProtoRpcPeer({
        requested: {},
        exposed: servicesHost.descriptors,
        handlers: servicesHost.services,
        port: hostPort
      });

      void server.open(); // This blocks until the other client connects.
      afterTest(() => server.close());

      return new Client(
        {
          runtime: {
            client: {
              mode: Runtime.Client.Mode.REMOTE
            }
          }
        },
        { rpcPort: proxyPort }
      );
    });
  });

  describe('remote - WebRTC proxy', function () {
    const signalManagerContext = new MemorySignalManagerContext();

    testSuite(async () => {
      const config = new Config({
        runtime: {
          client: {
            mode: Runtime.Client.Mode.REMOTE
          }
        }
      });

      const networkManager = new NetworkManager({
        signalManager: new MemorySignalManager(signalManagerContext),
        transportFactory: MemoryTransportFactory
      });

      const [proxyPort, hostPort] = createLinkedPorts();
      const clientServicesHost = new ClientServicesHost({ config, networkManager });
      await clientServicesHost.open();
      afterTest(() => clientServicesHost.close());

      const server = createBundledRpcServer({
        services: clientServicesHost.descriptors,
        handlers: clientServicesHost.services,
        port: hostPort
      });

      void server.open(); // This blocks until the other client connects.
      afterTest(() => server.close());

      return new Client(config, { rpcPort: proxyPort });
    });
  });

  // TODO(burdon): Factor out tests.

  it.skip('late-register models after refresh', async function () {
    const config: ConfigProto = {
      version: 1,
      runtime: {
        client: {
          storage: {
            persistent: true,
            path: `/tmp/dxos-${Date.now()}`
          }
        }
      }
    };

    {
      const client = new Client(config);
      await client.initialize();
      client.echo.registerModel(TestModel);
      // TODO(burdon): Better error if halo is not created.
      await client.halo.createProfile({ username: 'test-user' });
      const party = await client.echo.createParty();

      const item = await party.database.createItem({
        model: TestModel,
        type: 'test'
      });
      await item.model.set('prop', 'value1');

      await client.destroy();
    }

    {
      const client = new Client(config);
      await client.initialize();
      await waitForCondition(() => !!client.halo.profile);
      await sleep(10); // Make sure all events were processed.

      client.echo.registerModel(TestModel);

      const party = client.echo.queryParties().first;
      const result = party.database.select({ type: 'test' }).exec();
      await result.update.waitForCondition(() => result.entities.length > 0);
      const item = result.expectOne();

      expect(item.model.get('prop')).toEqual('value1');

      await item.model.set('prop', 'value2');
      expect(item.model.get('prop')).toEqual('value2');

      await client.destroy();
    }
  });
});
