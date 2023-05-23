//
// Copyright 2022 DXOS.org
//

import { Args, ux } from '@oclif/core';

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { mapMembers, printMembers, selectSpace } from '../../util';

export default class Members extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'List space members.';
  static override flags = {
    ...BaseCommand.flags,
    ...ux.table.flags(),
  };

  static override args = { key: Args.string({ required: true }) };

  async run(): Promise<any> {
    const { args, flags } = await this.parse(Members);
    let { key } = args;

    return await this.execWithClient(async (client: Client) => {
      const spaces = await client.spaces.get();
      if (!key) {
        key = await selectSpace(spaces);
      }

      const space = spaces.find((space) => space.key.toHex().startsWith(key));
      if (!space) {
        this.log('Invalid key');
        return;
      }

      const members = space.members.get();
      if (!flags.json) {
        printMembers(members, flags);
      }

      return mapMembers(members);
    });
  }
}
