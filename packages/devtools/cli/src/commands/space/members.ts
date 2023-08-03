//
// Copyright 2022 DXOS.org
//

import { Args, ux } from '@oclif/core';

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { mapMembers, printMembers, selectSpace, waitForSpace } from '../../util';

export default class Members extends BaseCommand<typeof Members> {
  static override enableJsonFlag = true;
  static override description = 'List space members.';
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
      const members = space.members.get();
      if (!this.flags.json) {
        printMembers(members, this.flags);
      }

      return mapMembers(members);
    });
  }
}
