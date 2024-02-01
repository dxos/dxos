//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';
import platform from 'platform';

import { asyncTimeout } from '@dxos/async';
import { type Client } from '@dxos/client';
import { invariant } from '@dxos/invariant';
import { DeviceType } from '@dxos/protocols/proto/dxos/halo/credentials';

import { BaseCommand } from '../../base-command';
import { IdentityWaitTimeoutError } from '../../errors';
import { IDENTITY_WAIT_TIMEOUT } from '../../timeouts';

export default class Update extends BaseCommand<typeof Update> {
  static override description = 'Update device info.';
  static override flags = {
    ...BaseCommand.flags,
    label: Flags.string({ description: 'Set device label' }),
  };

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      // TODO(mykola): Hack to wait for identity with `client.halo.identity.wait()`.
      await asyncTimeout(client.spaces.isReady.wait(), IDENTITY_WAIT_TIMEOUT, new IdentityWaitTimeoutError());
      const device = client.halo.device;

      if (!device) {
        this.log('No device found.');
        return;
      }

      let label = device.profile?.label;
      if (this.flags.label) {
        label = this.flags.label;
      }

      invariant(client.services.services.DevicesService, 'DevicesService not found');
      // TODO(nf): dedupe
      const uDevice = await client.services.services.DevicesService.updateDevice({
        label,
        type: DeviceType.AGENT,
        platform: platform.name,
        platformVersion: platform.version,
        architecture: typeof platform.os?.architecture === 'number' ? String(platform.os.architecture) : undefined,
        os: platform.os?.family,
        osVersion: platform.os?.version,
      });
      this.log('Device updated:', uDevice);

      return uDevice;
    });
  }
}
