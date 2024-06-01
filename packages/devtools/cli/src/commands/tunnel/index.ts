//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { humanize } from '@dxos/util';

import { BaseCommand } from '../../base';
import { printTunnels, type TunnelRpcPeer } from '../../util';

/**
 * @deprecated
 */
export default class Tunnel extends BaseCommand<typeof Tunnel> {
  static {
    this.state = 'deprecated';
    this.enableJsonFlag = true;
    this.description = 'Enable or disable tunnel (deprecated).';
    this.args = {
      command: Args.string({ description: 'Start.', values: ['start', 'stop'], required: true }),
    };
  }

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
