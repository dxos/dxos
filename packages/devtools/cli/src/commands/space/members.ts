//
// Copyright 2022 DXOS.org
//

import { ux } from '@oclif/core';

import { type Client } from '@dxos/client';

import { ARG_SPACE_KEYS, BaseCommand } from '../../base';
import { mapMembers, printMembers } from '../../util';

export default class Members extends BaseCommand<typeof Members> {
  static override enableJsonFlag = true;
  static override description = 'List space members.';
  static override args = ARG_SPACE_KEYS;
  static override flags = {
    ...BaseCommand.flags,
    ...ux.table.flags(),
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
