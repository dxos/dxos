//
// Copyright 2023 DXOS.org
//

import { Args, ux } from '@oclif/core';
import chalk from 'chalk';

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';

export default class Rename extends BaseCommand<typeof Rename> {
  static override enableJsonFlag = true;
  static override description = 'Set current device label.';

  static override args = {
    label: Args.string({ description: 'Device new label.' }),
  };

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      // TODO(mykola): Hack to wait for identity with `client.halo.identity.wait()`.
      await client.spaces.isReady.wait();
      let { label } = this.args;

      if (!label) {
        label = await ux.prompt('Device label');
      }

      const device = await client.halo.updateDevice({ displayName: label });

      this.log(chalk`{green Renamed:}`, device.profile?.displayName);

      return device;
    });
  }
}
