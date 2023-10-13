//
// Copyright 2023 DXOS.org
//

import { BaseCommand } from '../../base-command';
import { type TunnelRpcPeer, printTunnels } from '../../util';

export default class List extends BaseCommand<typeof List> {
  static override enableJsonFlag = true;
  static override description = 'List tunnels.';

  async run(): Promise<any> {
    return await this.execWithTunneling(async (tunnel: TunnelRpcPeer) => {
      const response = await tunnel.rpc.listTunnels();
      if (response.tunnels) {
        printTunnels(response.tunnels, this.flags);
      }
    });
  }
}
