//
// Copyright 2022 DXOS.org
//

import { Flags } from '@oclif/core';

import { type Client } from '@dxos/client';
import { DeviceType } from '@dxos/protocols/proto/dxos/halo/credentials';

import { BaseCommand } from '../../base';

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
        identity = await client.halo.createIdentity(
          { displayName },
          {
            type: managedAgent ? DeviceType.AGENT_MANAGED : DeviceType.AGENT,
            ...(deviceLabel ? { label: deviceLabel } : {}),
          },
        );
        return { identityKey: identity.identityKey.toHex(), displayName };
      }
    });
  }
}
