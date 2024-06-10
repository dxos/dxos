//
// Copyright 2022 DXOS.org
//

import { asyncTimeout } from '@dxos/async';
import { printDevices, TABLE_FLAGS, IdentityWaitTimeoutError, IDENTITY_WAIT_TIMEOUT } from '@dxos/cli-base';

import { BaseCommand } from '../../base';

export default class List extends BaseCommand<typeof List> {
  static override enableJsonFlag = true;
  static override description = 'Show device info.';
  static override flags = {
    ...BaseCommand.flags,
    ...TABLE_FLAGS,
  };

  async run(): Promise<any> {
    return await this.execWithClient(async ({ client }) => {
      await asyncTimeout(client.spaces.isReady.wait(), IDENTITY_WAIT_TIMEOUT, new IdentityWaitTimeoutError());
      const devices = client.halo.devices.get();
      printDevices(devices, this.flags);
      return devices;
    });
  }
}
