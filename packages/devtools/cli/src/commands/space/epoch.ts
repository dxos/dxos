//
// Copyright 2022 DXOS.org
//

import { Args, ux } from '@oclif/core';

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { selectSpace, waitForSpace } from '../../util';

export default class Epoch extends BaseCommand<typeof Epoch> {
  static override enableJsonFlag = true;
  static override description = 'Create new epoch.';
  static override flags = {
    ...BaseCommand.flags,
    ...ux.table.flags(),
  };

  static override args = { key: Args.string({ description: 'Space key head in hex.' }) };

  async run(): Promise<any> {
    let { key } = this.args;
    return await this.execWithClient(async (client: Client) => {
      const spaces = client.spaces.get();
      if (!key) {
        key = await selectSpace(spaces);
      }
      const space = spaces.find((space) => space.key.toHex().startsWith(key!));
      if (!space) {
        this.error('Invalid key');
      }

      await waitForSpace(space, (err) => this.error(err));
      await space.internal.createEpoch();
    });
  }
}
