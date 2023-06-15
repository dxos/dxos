//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { printDevices } from '../../util';

export default class List extends BaseCommand<typeof List> {
  static override enableJsonFlag = true;
  static override description = 'Show device info.';

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const devices = client.halo.devices.get();
      printDevices(devices, this.flags);
      return devices;
    });
  }
}
