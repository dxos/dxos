//
// Copyright 2022 DXOS.org
//

import { BaseCommand } from '../../base-command';
import { PublisherRpcPeer } from '../../util/publisher-rpc-peer';

export default class List extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'List apps.';

  async run (): Promise<any> {
    // const { flags } = await this.parse(List);
    return await this.execWithPublisher(async (rpc: PublisherRpcPeer) => {
      const apps = await rpc.rpc.list();
      console.log('Received published apps', JSON.stringify(apps));
      return apps;
    });
  }
}
