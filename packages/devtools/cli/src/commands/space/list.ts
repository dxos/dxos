//
// Copyright 2022 DXOS.org
//

import { ux } from '@oclif/core';

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { mapSpaces, printSpaces } from '../../util';

export default class List extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'List spaces.';
  static override flags = {
    ...BaseCommand.flags,
    ...ux.table.flags(),
  };

  async run(): Promise<any> {
    const { flags } = await this.parse(List);

    return await this.execWithClient(async (client: Client) => {
      const spaces = client.spaces.get();
      if (!flags.json) {
        printSpaces(spaces, flags);
      }

      return mapSpaces(spaces);
    });
  }
}
