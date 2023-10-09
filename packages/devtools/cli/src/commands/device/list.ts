//
// Copyright 2022 DXOS.org
//

import { ux } from '@oclif/core';

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { printDevices } from '../../util';

export default class List extends BaseCommand<typeof List> {
  static override enableJsonFlag = true;
  static override description = 'Show device info.';
  static override flags = {
    ...BaseCommand.flags,
    ...ux.table.flags(),
  };

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      await client.spaces.isReady.wait();
      const devices = client.halo.devices.get();
      printDevices(devices, this.flags);
      return devices;
    });
  }
}
