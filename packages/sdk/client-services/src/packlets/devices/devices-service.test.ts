//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Trigger } from '@dxos/async';
import { DevicesService, Device } from '@dxos/protocols/proto/dxos/client/services';
import { afterEach, afterTest, beforeEach, describe, test } from '@dxos/test';

import { ServiceContext } from '../services';
import { createServiceContext } from '../testing';
import { DevicesServiceImpl } from './devices-service';

describe('DevicesService', () => {
  let serviceContext: ServiceContext;
  let devicesService: DevicesService;

  beforeEach(async () => {
    serviceContext = createServiceContext();
    await serviceContext.open();
    devicesService = new DevicesServiceImpl(serviceContext.identityManager);
  });

  afterEach(async () => {
    await serviceContext.close();
  });

  describe.skip('updateDevice', () => {});

  describe('queryDevices', () => {
    test('returns empty list if no identity is available', async () => {
      const query = devicesService.queryDevices();
      const result = new Trigger<Device[] | undefined>();
      query.subscribe(({ devices }) => {
        result.wake(devices);
      });
      afterTest(() => query.close());
      expect(await result.wait()).to.be.length(0);
    });

    test('updates when identity is created', async () => {
      const query = devicesService.queryDevices();
      let result = new Trigger<Device[] | undefined>();
      query.subscribe(({ devices }) => {
        result.wake(devices);
      });
      afterTest(() => query.close());
      expect(await result.wait()).to.be.length(0);

      result = new Trigger<Device[] | undefined>();
      await serviceContext.createIdentity();
      expect(await result.wait()).to.be.length(1);
    });
  });
});
