//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { BaseCommand } from '../../base-command';
import { printModules } from '../../util/publish/common';
import { PublisherRpcPeer } from '../../util/publisher-rpc-peer';

export default class List extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'List apps.';

  async run (): Promise<any> {
    const { flags } = await this.parse(List);
    return await this.execWithPublisher(async (rpc: PublisherRpcPeer) => {
      const listResponse = await rpc.rpc.list();
      assert(listResponse.modules!, 'Unable to list deploymemts.');
      printModules(listResponse.modules!, flags);
    });
  }
}
