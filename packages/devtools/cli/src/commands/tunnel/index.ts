//
// Copyright 2023 DXOS.org
//

import { Args, Flags } from '@oclif/core';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { humanize } from '@dxos/util';

import { BaseCommand } from '../../base-command';
import { type TunnelRpcPeer, printTunnels } from '../../util';

export default class Tunnel extends BaseCommand<typeof Tunnel> {
  static override enableJsonFlag = true;
  static override description = 'Enable or disable tunnel.';
  static override args = {
    command: Args.string({ description: 'Start.', values: ['start', 'stop'], required: true }),
  };

  static override flags = {
    ...BaseCommand.flags,
    name: Flags.string({
      description: 'Tunnel name',
      async default() {
        return humanize(PublicKey.random());
      },
    }),
  };

  async run(): Promise<any> {
    return await this.execWithTunneling(async (tunnel: TunnelRpcPeer) => {
      const { command } = this.args;
      const { name } = this.flags;
      const response = await tunnel.rpc.tunnel({ name, enabled: command === 'start' });
      invariant(response, 'Unable to set tunnel.');
      printTunnels([response], this.flags);
    });
  }
}
