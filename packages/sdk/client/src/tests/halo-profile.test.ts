//
// Copyright 2021 DXOS.org
//

import { expect } from 'chai';

import { Trigger, asyncTimeout } from '@dxos/async';
import { performInvitation } from '@dxos/client-services/testing';
import { invariant } from '@dxos/invariant';
import { DeviceKind } from '@dxos/protocols/proto/dxos/client/services';
import { describe, test, afterTest } from '@dxos/test';

import { Client } from '../client';
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

  test('creates an identity with a custom device profile', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({ services: testBuilder.createLocal() });
    afterTest(() => client.destroy());
    await client.initialize();

    await client.halo.createIdentity({ displayName: 'test-user' }, { label: 'custom-device-profile' });
    expect(client.halo.identity).exist;

    expect(await client.halo.devices.get()).to.have.lengthOf(1);
    expect(client.halo.identity.get()!.profile?.displayName).to.equal('test-user');
    expect(client.halo.device?.profile?.label).to.equal('custom-device-profile');
  });

  test('updates profile', async () => {
    const testBuilder = new TestBuilder();

    const client = new Client({ services: testBuilder.createLocal() });
    afterTest(() => client.destroy());
    await client.initialize();

    await client.halo.createIdentity({ displayName: 'test-user' });
    expect(client.halo.identity.get()!.profile?.displayName).to.equal('test-user');

    await client.halo.updateProfile({ displayName: 'test-user-updated' });
    expect(client.halo.identity.get()!.profile?.displayName).to.equal('test-user-updated');
  });

  test('device invitations', async () => {
    const testBuilder = new TestBuilder();

    const client1 = new Client({ services: testBuilder.createLocal() });
    afterTest(() => client1.destroy());
    await client1.initialize();

    // Set a custom device profile for the host to ensure we're matching the default on the guest.
    await client1.halo.createIdentity({ displayName: 'test-user' }, { label: 'host-device-profile' });
    expect(client1.halo.identity).exist;

    expect(await client1.halo.devices.get()).to.have.lengthOf(1);

    const client2 = new Client({ services: testBuilder.createLocal() });
    afterTest(() => client2.destroy());
    await client2.initialize();

    const trigger = new Trigger();
    client1.halo.devices.subscribe((devices) => {
      // TODO(nf): deepEquals?
      if (
        devices.find((device) => device.deviceKey !== client1.halo.device?.deviceKey)?.profile?.label ===
        'guest-device-label'
      ) {
        trigger.wake();
      }
    });

    await Promise.all(
      performInvitation({
        host: client1.halo,
        guest: client2.halo,
        guestDeviceProfile: { label: 'guest-device-label' },
      }),
    );

    expect(await client1.halo.devices.get()).to.have.lengthOf(2);
    expect(await client2.halo.devices.get()).to.have.lengthOf(2);
    expect(client2.halo.device?.profile?.label).to.equal('guest-device-label');
    await trigger.wait();
    const client2DeviceOnClient1 = client1.halo.devices.get().find((device) => device.kind !== DeviceKind.CURRENT);
    expect(client2DeviceOnClient1).exist;
    expect(client2DeviceOnClient1?.profile?.label).to.equal('guest-device-label');
  });

  test('device invitation with custom guest device profile', async () => {
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
    // TODO(nf): how to test halo.join() more directly?

    const trigger = new Trigger();
    client1.halo.devices.subscribe((devices) => {
      if (
        devices.find((device) => device.deviceKey !== client1.halo.device?.deviceKey)?.profile?.label ===
        'guest-device-profile'
      ) {
        trigger.wake();
      }
    });

    await Promise.all(
      performInvitation({
        host: client1.halo,
        guest: client2.halo,
        guestDeviceProfile: { label: 'guest-device-profile' },
      }),
    );

    expect(await client1.halo.devices.get()).to.have.lengthOf(2);
    expect(await client2.halo.devices.get()).to.have.lengthOf(2);
    expect(client2.halo.device?.profile?.label).to.equal('guest-device-profile');
    await trigger.wait();
    expect(client1.halo.devices.get().find((device) => device.kind !== DeviceKind.CURRENT)?.profile?.label).to.equal(
      'guest-device-profile',
    );
  });

  test('identity profile update is visible to other devices', async () => {
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

    await Promise.all(performInvitation({ host: client1.halo, guest: client2.halo }));

    expect(await client1.halo.devices.get()).to.have.lengthOf(2);

    const trigger = new Trigger();
    client2.halo.identity.subscribe((identity) => {
      if (identity?.profile?.displayName === 'test-user-updated') {
        trigger.wake();
      }
    });

    await client1.halo.updateProfile({ displayName: 'test-user-updated' });
    await asyncTimeout(trigger.wait(), 500);

    expect(client2.halo.identity.get()!.profile?.displayName).to.equal('test-user-updated');
  });

  test('device profile update is visible to other devices', async () => {
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

    await Promise.all(performInvitation({ host: client1.halo, guest: client2.halo }));

    expect(await client1.halo.devices.get()).to.have.lengthOf(2);
    expect(await client2.halo.devices.get()).to.have.lengthOf(2);

    invariant(client1.services.services?.DevicesService, 'DevicesService is not available');
    await client1?.services?.services?.DevicesService?.updateDevice({
      label: 'updated-device-profile',
    });

    const trigger = new Trigger();
    client2.halo.devices.subscribe((devices) => {
      if (
        devices.find((device) => device.deviceKey !== client1.halo.device?.deviceKey)?.profile?.label ===
        'updated-device-profile'
      ) {
        trigger.wake();
      }
    });

    await asyncTimeout(trigger.wait(), 500);
    expect(
      client2.halo.devices.get().find((device) => device.deviceKey !== client1.halo.device?.deviceKey)?.profile?.label,
    ).to.equal('updated-device-profile');
  });
});
