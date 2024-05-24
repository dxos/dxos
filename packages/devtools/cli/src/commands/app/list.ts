//
// Copyright 2023 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { BaseCommand } from '../../base';
import { printModules, type PublisherRpcPeer } from '../../util';

/**
 * @deprecated
 */
export default class List extends BaseCommand<typeof List> {
  static override state = 'deprecated';
  static override enableJsonFlag = true;
  static override description = 'List apps.';

  async run(): Promise<any> {
    return await this.execWithPublisher(async (publisher: PublisherRpcPeer) => {
      const listResponse = await publisher.rpc.list();
      invariant(listResponse.modules!, 'Unable to list deploymemts.');
      await printModules(listResponse.modules!, this.flags);
    });
  }
}
