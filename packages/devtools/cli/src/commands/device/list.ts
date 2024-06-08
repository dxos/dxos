//
// Copyright 2022 DXOS.org
//

import { asyncTimeout } from '@dxos/async';
import { type Client } from '@dxos/client';

import { BaseCommand } from '../../base';
import { IdentityWaitTimeoutError } from '../../errors';
import { IDENTITY_WAIT_TIMEOUT } from '../../timeouts';
import { printDevices, TABLE_FLAGS } from '../../util';

export default class List extends BaseCommand<typeof List> {
  static override enableJsonFlag = true;
  static override description = 'Show device info.';
  static override flags = {
    ...BaseCommand.flags,
    ...TABLE_FLAGS,
  };

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      await asyncTimeout(client.spaces.isReady.wait(), IDENTITY_WAIT_TIMEOUT, new IdentityWaitTimeoutError());
      const devices = client.halo.devices.get();
      printDevices(devices, this.flags);
      return devices;
    });
  }
}
