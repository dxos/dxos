//
// Copyright 2022 DXOS.org
//

import { type Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';

export default class Keys extends BaseCommand<typeof Keys> {
  static override enableJsonFlag = true;
  static override description = 'Show HALO keys.';

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      console.log(client.halo);
    });
  }
}
