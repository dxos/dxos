//
// Copyright 2022 DXOS.org
//

import { Args, Flags } from '@oclif/core';

import { type Client } from '@dxos/client';
import { DeviceType } from '@dxos/protocols/proto/dxos/halo/credentials';

import { BaseCommand } from '../../base';

export default class Create extends BaseCommand<typeof Create> {
  static override enableJsonFlag = true;
  static override description = 'Create HALO.';
  static override args = {
    displayName: Args.string({ description: 'Display name', default: 'Agent' }),
  };

  static override flags = {
    ...BaseCommand.flags,
    deviceLabel: Flags.string({ description: 'Device label' }),
    // TODO(burdon): Rename flags.
    managedAgent: Flags.boolean({ description: 'Managed agent', default: false }),
  };

  async run(): Promise<any> {
    const { displayName } = this.args;
    const { managedAgent, deviceLabel } = this.flags;

    return await this.execWithClient(
      async (client: Client) => {
        let identity = client.halo.identity.get();
        if (identity) {
          this.error('Identity already initialized.');
        }

        identity = await client.halo.createIdentity(
          { displayName },
          {
            label: deviceLabel,
            // TODO(burdon): Default should not be agent?
            type: managedAgent ? DeviceType.AGENT_MANAGED : DeviceType.AGENT,
          },
        );
        return { identityKey: identity.identityKey.toHex(), displayName };
      },
      { halo: false },
    );
  }
}
