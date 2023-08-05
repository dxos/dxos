//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';
import assert from 'node:assert';

import { BaseCommand } from '../../base-command';
import { TunnelRpcPeer, printTunnels } from '../../util';

export default class Set extends BaseCommand<typeof Set> {
  static override enableJsonFlag = true;
  static override description = 'Enable or disable tunnel.';

  static override flags = {
    ...BaseCommand.flags,
    app: Flags.string({
      description: 'Application name',
      required: true,
    }),
    enabled: Flags.boolean({
      description: 'Enable tunnel.',
    }),
    disabled: Flags.boolean({
      description: 'Disable tunnel.',
    }),
  };

  async run(): Promise<any> {
    const { app, enabled, disabled } = this.flags;
    if (!!enabled === !!disabled) {
      this.error('Specify either --enabled or --disabled.');
    }

    return await this.execWithTunneling(async (tunnel: TunnelRpcPeer) => {
      const tunnelResponse = await tunnel.rpc.tunnel({ name: app, enabled: enabled && !disabled });
      assert(tunnelResponse, 'Unable to set tunnel.');
      printTunnels([tunnelResponse], this.flags);
    });
  }
}
