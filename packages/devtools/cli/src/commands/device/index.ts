//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';

export default class Device extends BaseCommand<typeof Device> {
  static override enableJsonFlag = true;
  static override description = 'Show device info.';

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const device = client.halo.device!;
      this.logToStderr('Device key:', device.deviceKey.toHex());
      return device;
    });
  }
}
