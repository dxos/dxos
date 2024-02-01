//
// Copyright 2022 DXOS.org
//

import chalk from 'chalk';

import { asyncTimeout } from '@dxos/async';
import { type Client } from '@dxos/client';
import { DeviceType } from '@dxos/protocols/proto/dxos/halo/credentials';

import { BaseCommand } from '../../base-command';
import { IdentityWaitTimeoutError } from '../../errors';
import { IDENTITY_WAIT_TIMEOUT } from '../../timeouts';

export default class Info extends BaseCommand<typeof Info> {
  static override enableJsonFlag = true;
  static override description = 'Show device info.';

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      // TODO(mykola): Hack to wait for identity with `client.halo.identity.wait()`.
      await asyncTimeout(client.spaces.isReady.wait(), IDENTITY_WAIT_TIMEOUT, new IdentityWaitTimeoutError());
      const device = client.halo.device;

      if (!device) {
        this.log('No device found.');
        return;
      }

      this.log(chalk`{magenta Device key:}`, device.deviceKey.toHex());
      this.log(chalk`{magenta Device profile:}`, {
        ...device.profile,
        type: device.profile?.type ? DeviceType[device.profile?.type] : 'UNKNOWN',
      });

      return device;
    });
  }
}
