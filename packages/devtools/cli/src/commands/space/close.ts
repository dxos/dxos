//
// Copyright 2022 DXOS.org
//

import { type Client } from '@dxos/client';

import { ARG_SPACE_KEYS, BaseCommand } from '../../base';

export default class Close extends BaseCommand<typeof Close> {
  static override description = 'Close space.';
  static override args = ARG_SPACE_KEYS;

  async run(): Promise<any> {
    const { key } = this.args;
    return await this.execWithClient(async (client: Client) => {
      const space = await this.getSpace(client, key, false);
      await space.close();
    });
  }
}
