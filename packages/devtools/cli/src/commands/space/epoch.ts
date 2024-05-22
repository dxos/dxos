//
// Copyright 2022 DXOS.org
//

import { type Client } from '@dxos/client';

import { BaseCommand, SPACE_KEY } from '../../base';

export default class Epoch extends BaseCommand<typeof Epoch> {
  static override enableJsonFlag = true;
  static override description = 'Create new epoch.';
  static override args = SPACE_KEY;

  async run(): Promise<any> {
    const { key } = this.args;
    return await this.execWithClient(async (client: Client) => {
      const space = await this.getSpace(client, key);
      await space.internal.createEpoch();
    });
  }
}
