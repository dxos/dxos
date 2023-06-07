//
// Copyright 2023 DXOS.org
//

import assert from 'node:assert';

import { BaseCommand } from '../../base-command';
import { TunnelRpcPeer, printTunnels } from '../../util';

export default class List extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'List tunnels.';

  async run(): Promise<any> {
    const { flags } = await this.parse(List);
    try {
      return await this.execWithTunneling(async (tunnel: TunnelRpcPeer) => {
        const listResponse = await tunnel.rpc.listTunnels();
        assert(listResponse.tunnels!, 'Unable to list tunnels.');
        printTunnels(listResponse.tunnels!, flags);
      });
    } catch (err: any) {
      this.log(`Unable to list: ${err.message}`);
      this.error(err, { exit: 1 });
    }
  }
}
