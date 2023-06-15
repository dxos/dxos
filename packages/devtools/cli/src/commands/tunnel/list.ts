//
// Copyright 2023 DXOS.org
//

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
        if (!listResponse.tunnels) {
          throw new Error();
        }
        printTunnels(listResponse.tunnels!, flags);
      });
    } catch (err: any) {
      this.log(`Unable to list: ${err.message}`);
      this.error(err, { exit: 1 });
    }
  }
}
