//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';

import { asyncTimeout } from '@dxos/async';
import { type Client } from '@dxos/client';
import { invariant } from '@dxos/invariant';

import { BaseCommand } from '../../base';
import { IdentityWaitTimeoutError } from '../../errors';
import { IDENTITY_WAIT_TIMEOUT } from '../../timeouts';

export default class Update extends BaseCommand<typeof Update> {
  static override description = 'Update device info.';
  static override flags = {
    ...BaseCommand.flags,
    label: Flags.string({ description: 'Set device label', required: true }),
  };

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      // TODO(mykola): Hack to wait for identity with `client.halo.identity.wait()`.
      await asyncTimeout(client.spaces.isReady.wait(), IDENTITY_WAIT_TIMEOUT, new IdentityWaitTimeoutError());
      // TODO(nf): should updateDevice also apply defaults?
      const updatedProfile = {
        ...client.halo.device?.profile,
        label: this.flags.label,
      };

      invariant(client.services.services.DevicesService, 'DevicesService not found');
      // TODO(nf): dedupe
      const uDevice = await client.services.services.DevicesService.updateDevice(updatedProfile);
      this.log('Device updated:', uDevice);

      return uDevice;
    });
  }
}
