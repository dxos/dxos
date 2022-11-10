//
// Copyright 2022 DXOS.org
//

import { CliUx } from '@oclif/core';

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { mapMembers, printMembers, selectSpace } from '../../util';

export default class Members extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'List space members.';
  static override flags = {
    ...BaseCommand.flags,
    ...CliUx.ux.table.flags()
  };

  static override args = [
    {
      name: 'key'
    }
  ];

  async run(): Promise<any> {
    const { args, flags } = await this.parse(Members);
    let { key } = args;

    return await this.execWithClient(async (client: Client) => {
      const { value: parties = [] } = await client.echo.queryParties();
      if (!key) {
        key = await selectSpace(parties);
      }

      const space = parties.find((space) => space.key.toHex().startsWith(key));
      if (!space) {
        this.log('Invalid key');
        return;
      }

      const { value: members = [] } = space.queryMembers();
      if (!flags.json) {
        printMembers(members, flags);
      }

      return mapMembers(members);
    });
  }
}
