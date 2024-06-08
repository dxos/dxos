//
// Copyright 2022 DXOS.org
//

import { mapMembers, printMembers, TABLE_FLAGS, ARG_SPACE_KEYS } from '@dxos/cli-base';
import { type Client } from '@dxos/client';

import { BaseCommand } from '../../base';

export default class Members extends BaseCommand<typeof Members> {
  static override enableJsonFlag = true;
  static override description = 'List space members.';
  static override args = ARG_SPACE_KEYS;
  static override flags = {
    ...BaseCommand.flags,
    ...TABLE_FLAGS,
  };

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const space = await this.getSpace(client, this.args.key);
      const members = space.members.get();
      if (this.flags.json) {
        return mapMembers(members);
      } else {
        printMembers(members, this.flags);
      }
    });
  }
}
