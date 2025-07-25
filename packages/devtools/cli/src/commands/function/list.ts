//
// Copyright 2023 DXOS.org
//

import { log } from '@dxos/log';

import { BaseCommand } from '../../base';

export default class List extends BaseCommand<typeof List> {
  static override enableJsonFlag = true;
  static override description = 'List functions.';

  async run(): Promise<any> {
    return await this.execWithClient(async ({ client }) => {
      // TODO(dmaretskyi): Move into system service?

      log.info('DXOS: listing functions', { identity: client.halo.identity.get() });
      const functions = await client.edge.listFunctions();
      log.info('DXOS: functions', { functions });
      return functions;
    });
  }
}
