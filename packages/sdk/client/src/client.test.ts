//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';

import { latch, sleep, waitForCondition } from '@dxos/async';
import { defs } from '@dxos/config';
import { TestModel } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { createBundledRpcServer, createLinkedPorts, RpcClosedError } from '@dxos/rpc';
import { afterTest } from '@dxos/testutils';

import { Client } from './client';
import { clientServiceBundle } from './interfaces';
import { InvitationProcess } from './proto/gen/dxos/client';

describe('Client', () => {
  function testSuite (createClient: () => Promise<Client>) {
    describe('initialization', () => {
      test('initialize and destroy', async () => {
        const client = await createClient();
        await client.initialize();
        await client.destroy();
      }).timeout(200);

      test('initialize and destroy are idempotent', async () => {
        const client = await createClient();
        await client.initialize();
        await client.initialize();
        expect(client.initialized).toBeTruthy();

        await client.destroy();
        await client.destroy();
        expect(client.initialized).toBeFalsy();
      });
    });

    describe('profile', () => {
      test('creates a remote profile', async () => {
        const client = await createClient();

        await client.initialize();
        afterTest(() => client.destroy());

        const profile = await client.halo.createProfile({ username: 'test-user' });

        expect(profile).toBeDefined();
        expect(profile?.username).toEqual('test-user');

        expect(client.halo.profile).toBeDefined();
      }).timeout(500);

      test('creating profile twice throws an error', async () => {
        const client = await createClient();
        await client.initialize();
        afterTest(() => client.destroy());

        await client.halo.createProfile({ username: 'test-user' });
        expect(client.halo.hasProfile()).toBeTruthy();

        await expect(client.halo.createProfile({ username: 'test-user' })).rejects.toThrow();
        expect(client.halo.hasProfile()).toBeTruthy();
      });
    });

    describe('device invitations', () => {
      test('creates and joins a HALO invitation', async () => {
        const inviter = await createClient();
        await inviter.initialize();
        afterTest(() => inviter.destroy());
        const invitee = await createClient();
        await invitee.initialize();
        afterTest(() => invitee.destroy());

        await inviter.halo.createProfile({ username: 'test-user' });

        // TODO(dmaretskyi): Refactor to not use services directly.
        let inviteeInvitationProcess: InvitationProcess;
        inviter.services.ProfileService.CreateInvitation().subscribe(async inviterInvitation => {
          if (!inviteeInvitationProcess) {
            inviteeInvitationProcess = await invitee.services.ProfileService.AcceptInvitation({ invitationCode: inviterInvitation.invitationCode });
          } else if (inviterInvitation.secret) {
            await invitee.services.ProfileService.AuthenticateInvitation({ process: inviteeInvitationProcess, secret: inviterInvitation.secret });
          }
        }, (error) => {
          if (!(error instanceof RpcClosedError)) {
            throw error;
          }
        });

        const [inviteeProfileLatch, inviteeProfileTrigger] = latch();
        invitee.services.ProfileService.SubscribeProfile().subscribe(inviteeProfile => {
          if (inviteeProfile.profile?.username === 'test-user') {
            inviteeProfileTrigger();
          }
        }, error => {
          if (!(error instanceof RpcClosedError)) {
            throw error;
          }
        });
        await inviteeProfileLatch;
      }).timeout(5000);
    });

    describe('data', () => {
      test('create party and item', async () => {
        const client = await createClient();
        await client.initialize();
        afterTest(() => client.destroy());

        await client.halo.createProfile();
        const party = await client.echo.createParty();

        const item = await party.database.createItem({ model: ObjectModel });
        await item.model.setProperty('foo', 'bar');

        expect(item.model.getProperty('foo')).toEqual('bar');
      });

      test('set party properties', async () => {
        const client = await createClient();
        await client.initialize();
        afterTest(() => client.destroy());

        await client.halo.createProfile();
        const party = await client.echo.createParty();
        await party.open();

        await party.setTitle('test-party');
        const title = party.getProperty('title');
        expect(title).toEqual('test-party');
      });

      test('Properly creates multiple items in a party', async () => {
        const client = await createClient();
        await client.initialize();
        afterTest(() => client.destroy());

        await client.halo.createProfile();
        const party = await client.echo.createParty();
        await party.open();

        const item1 = await party.database.createItem({ model: ObjectModel, type: 'test' });
        await item1.model.setProperty('prop1', 'x');
        const item2 = await party.database.createItem({ model: ObjectModel, type: 'test' });
        await item2.model.setProperty('prop1', 'y');

        expect(item1.model.getProperty('prop1')).toEqual('x');
      });
    });
  }

  describe('local', () => {
    testSuite(async () => {
      return new Client();
    });
  });

  describe('remote', () => {
    testSuite(async () => {
      const [proxyPort, hostPort] = createLinkedPorts();

      const hostClient = new Client();
      await hostClient.initialize();
      afterTest(() => hostClient.destroy());

      const server = createBundledRpcServer({
        services: clientServiceBundle,
        handlers: hostClient.services,
        port: hostPort
      });
      void server.open(); // This is blocks until the other client connects.
      afterTest(() => server.close());

      return new Client({ system: { remote: true } }, { rpcPort: proxyPort });
    });
  });

  test('late-register models after refresh', async () => {
    const config: defs.Config = {
      system: {
        storage: {
          persistent: true,
          path: `/tmp/dxos-${Date.now()}`
        }
      }
    };

    {
      const client = new Client(config).registerModel(TestModel);
      await client.initialize();
      await client.halo.createProfile({ username: 'test-user' });
      const party = await client.echo.createParty();
      const item = await party.database.createItem({ model: TestModel, type: 'test' });
      await item.model.setProperty('prop', 'value1');

      await client.destroy();
    }

    {
      const client = new Client(config);
      await client.initialize();
      await waitForCondition(() => client.halo.hasProfile());
      await sleep(10); // Make sure all events were processed.

      client.registerModel(TestModel);

      const party = client.echo.queryParties().first;
      const selection = party.database.select(s => s.filter({ type: 'test' }).items);
      await selection.update.waitForCondition(() => selection.getValue().length > 0);

      const item = selection.expectOne();

      expect(item.model.getProperty('prop')).toEqual('value1');

      await item.model.setProperty('prop', 'value2');
      expect(item.model.getProperty('prop')).toEqual('value2');

      await client.destroy();
    }
  });
});
