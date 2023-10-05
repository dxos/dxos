//
// Copyright 2022 DXOS.org
//

import { sleep } from '@dxos/async';
import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { printDevices } from '../../util';

export default class Info extends BaseCommand<typeof Info> {
  static override enableJsonFlag = true;
  static override description = 'Show device info.';

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      // TODO(mykola): Hack to wait for identity with `client.halo.identity.wait()`.
      await client.spaces.isReady.wait();
      const device = client.halo.device;

      if (!device) {
        this.log('No device found.');
        return;
      }

      if (!this.flags.json) {
        printDevices([device], this.flags);
      }

      return device;
    });
  }
}
