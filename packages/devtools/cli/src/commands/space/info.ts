//
// Copyright 2022 DXOS.org
//

import { ARG_SPACE_KEYS } from '@dxos/cli-base';
import { type Client } from '@dxos/client';

import { BaseCommand } from '../../base';

export default class Info extends BaseCommand<typeof Info> {
  static override enableJsonFlag = true;
  static override description = 'Show space info.';
  static override args = ARG_SPACE_KEYS;

  async run(): Promise<any> {
    const { key } = this.args;
    return await this.execWithClient(async (client: Client) => {
      const space = await this.getSpace(client, key, false);
      // await space.waitUntilReady();
      // TODO(burdon): Factor out info (from diagnostics).
      const data = space.internal.data.metrics;
      if (this.flags.json) {
        return data;
      } else {
        this.log(JSON.stringify(data, undefined, 2));
      }
    });
  }
}
