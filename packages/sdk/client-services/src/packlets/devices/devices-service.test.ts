//
// Copyright 2023 DXOS.org
//

import * as Runtime from 'effect/Runtime';
import { afterEach, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { EffectEx } from '@dxos/effect';
import { Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { subscribeStream } from '@dxos/protocols';
import { type Device } from '@dxos/protocols/proto/dxos/client/services';

import { type ServiceContext } from '../services';
import { createServiceContext } from '../testing';
import { DevicesServiceImpl } from './devices-service';

describe('DevicesService', () => {
  let serviceContext: ServiceContext;
  let devicesService: DevicesServiceImpl;

  beforeEach(async () => {
    serviceContext = await createServiceContext();
    await serviceContext.open(new Context());
    devicesService = new DevicesServiceImpl(serviceContext.identityManager);
  });

  afterEach(async () => {
    await serviceContext.close();
  });

  describe('updateDevice', () => {
    test.skip('updates device profile', async () => {
      const stream = devicesService['DevicesService.queryDevices']();
      const device = await EffectEx.runPromise(devicesService['DevicesService.updateDevice']({ label: 'test-device' }));
      const result = new Trigger<Device[] | undefined>();
      const cleanup = subscribeStream(Runtime.defaultRuntime, stream, {
        onData: ({ devices }) => result.wake(devices),
      });
      onTestFinished(cleanup);
      expect(device.profile?.label).to.equal('test-device');
    });
  });

  describe('queryDevices', () => {
    test('returns empty list if no identity is available', async () => {
      const stream = devicesService['DevicesService.queryDevices']();
      const result = new Trigger<Device[] | undefined>();
      const cleanup = subscribeStream(Runtime.defaultRuntime, stream, {
        onData: ({ devices }) => result.wake(devices),
        onError: (err) => log.catch(err),
      });
      onTestFinished(cleanup);
      expect(await result.wait()).to.be.length(0);
    });

    test('updates when identity is created', async () => {
      const stream = devicesService['DevicesService.queryDevices']();
      let result = new Trigger<Device[] | undefined>();
      const cleanup = subscribeStream(Runtime.defaultRuntime, stream, {
        onData: ({ devices }) => result.wake(devices),
      });
      onTestFinished(cleanup);
      expect(await result.wait()).to.be.length(0);

      result = new Trigger<Device[] | undefined>();
      await serviceContext.createIdentity();
      expect(await result.wait()).to.be.length(1);
    });
  });
});
