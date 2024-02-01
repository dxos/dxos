//
// Copyright 2022 DXOS.org
//

import { Args, Flags } from '@oclif/core';

import { type Client } from '@dxos/client';
import { invariant } from '@dxos/invariant';
import { CreateDeviceProfileContext } from '@dxos/protocols/proto/dxos/client/services';
import { DeviceType } from '@dxos/protocols/proto/dxos/halo/credentials';

import { BaseCommand } from '../../base-command';

export default class Create extends BaseCommand<typeof Create> {
  static override enableJsonFlag = true;
  static override description = 'Create HALO.';
  static override args = {
    displayName: Args.string({ description: 'Display name', required: true }),
  };

  static override flags = {
    ...BaseCommand.flags,
    managedAgent: Flags.boolean({ description: 'Managed agent', default: false }),
    deviceLabel: Flags.string({ description: 'Device label' }),
  };

  async run(): Promise<any> {
    const { displayName } = this.args;
    const { managedAgent, deviceLabel } = this.flags;

    return await this.execWithClient(async (client: Client) => {
      let identity = client.halo.identity.get();
      if (identity) {
        this.log('Identity already initialized.');
      } else {
        invariant(client.services.services.DevicesService, 'DevicesService not available.');
        const deviceProfile = await client.services.services.DevicesService.createDeviceProfile({
          context: CreateDeviceProfileContext.INITIAL_DEVICE,
        });
        if (managedAgent) {
          deviceProfile.type = DeviceType.AGENT_MANAGED;
        }
        if (deviceLabel) {
          deviceProfile.label = deviceLabel;
        }
        identity = await client.halo.createIdentity({ displayName }, deviceProfile);
        return { identityKey: identity.identityKey.toHex(), displayName };
      }
    });
  }
}
