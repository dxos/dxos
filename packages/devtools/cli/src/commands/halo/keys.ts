//
// Copyright 2022 DXOS.org
//

import { BaseCommand } from '../../base';

export default class Keys extends BaseCommand<typeof Keys> {
  static override enableJsonFlag = true;
  static override description = 'Show HALO keys.';

  async run(): Promise<any> {
    return await this.execWithClient(async ({ client }) => {
      console.log(client.halo);
    });
  }
}
