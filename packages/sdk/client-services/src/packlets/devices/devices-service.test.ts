//
// Copyright 2023 DXOS.org
//

import { afterEach, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { type Device, type DevicesService } from '@dxos/protocols/proto/dxos/client/services';

import { type ServiceContext } from '../services';
import { createServiceContext } from '../testing';

import { DevicesServiceImpl } from './devices-service';

describe('DevicesService', () => {
  let serviceContext: ServiceContext;
  let devicesService: DevicesService;

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
      const query = devicesService.queryDevices();
      const device = await devicesService.updateDevice({ label: 'test-device' });
      const result = new Trigger<Device[] | undefined>();
      query.subscribe(({ devices }) => {
        result.wake(devices);
      });
      onTestFinished(() => query.close());
      expect(device.profile?.label).to.equal('test-device');
    });
  });

  describe('queryDevices', () => {
    test('returns empty list if no identity is available', async () => {
      const query = devicesService.queryDevices();
      const result = new Trigger<Device[] | undefined>();
      query.subscribe(
        ({ devices }) => {
          result.wake(devices);
        },
        (err) => log.catch(err),
      );
      onTestFinished(() => query.close().catch((err) => log.catch(err)));
      expect(await result.wait()).to.be.length(0);
    });

    test('updates when identity is created', async () => {
      const query = devicesService.queryDevices();
      let result = new Trigger<Device[] | undefined>();
      query.subscribe(({ devices }) => {
        result.wake(devices);
      });
      onTestFinished(() => query.close());
      expect(await result.wait()).to.be.length(0);

      result = new Trigger<Device[] | undefined>();
      await serviceContext.createIdentity();
      expect(await result.wait()).to.be.length(1);
    });
  });
});
