//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { BaseCommand } from '../../base-command';
import { type PublisherRpcPeer, printModules } from '../../util';

export default class List extends BaseCommand<typeof List> {
  static override enableJsonFlag = true;
  static override description = 'List apps.';

  async run(): Promise<any> {
    return await this.execWithPublisher(async (publisher: PublisherRpcPeer) => {
      const listResponse = await publisher.rpc.list();
      invariant(listResponse.modules!, 'Unable to list deploymemts.');
      printModules(listResponse.modules!, this.flags);
    });
  }
}
