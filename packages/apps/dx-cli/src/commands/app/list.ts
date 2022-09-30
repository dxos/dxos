//
// Copyright 2022 DXOS.org
//

import assert from 'assert';

import { BaseCommand } from '../../base-command';
import { PublisherRpcPeer, printModules } from '../../util';

export default class List extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'List apps.';

  async run (): Promise<any> {
    const { flags } = await this.parse(List);
    try {
      return await this.execWithPublisher(async (publisher: PublisherRpcPeer) => {
        const listResponse = await publisher.rpc.list();
        assert(listResponse.modules!, 'Unable to list deploymemts.');
        printModules(listResponse.modules!, flags);
      });
    } catch (err: any) {
      this.log(`Unable to list: ${err.message}`);
      this.error(err, { exit: 1 });
    }
  }
}
