//
// Copyright 2023 DXOS.org
//

import { TABLE_FLAGS } from '@dxos/cli-base';

import { BaseCommand } from '../../base';
import { printTunnels, type TunnelRpcPeer } from '../../util';

/**
 * @deprecated
 */
export default class List extends BaseCommand<typeof List> {
  static {
    this.state = 'deprecated';
    this.enableJsonFlag = true;
    this.description = 'List tunnels.';
  }

  static override flags = {
    ...BaseCommand.flags,
    ...TABLE_FLAGS,
  };

  async run(): Promise<any> {
    return await this.execWithTunneling(async (tunnel: TunnelRpcPeer) => {
      const response = await tunnel.rpc.listTunnels();
      if (response.tunnels) {
        printTunnels(response.tunnels, this.flags);
      }
    });
  }
}
