//
// Copyright 2023 DXOS.org
//

import { BaseCommand } from '../../base-command';
import { TunnelRpcPeer, printTunnels } from '../../util';

export default class List extends BaseCommand<typeof List> {
  static override enableJsonFlag = true;
  static override description = 'List tunnels.';

  async run(): Promise<any> {
    return await this.execWithTunneling(async (tunnel: TunnelRpcPeer) => {
      const listResponse = await tunnel.rpc.listTunnels();
      if (!listResponse.tunnels) {
        throw new Error();
      }
      printTunnels(listResponse.tunnels!, this.flags);
    });
  }
}
