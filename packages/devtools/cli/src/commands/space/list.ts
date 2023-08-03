//
// Copyright 2022 DXOS.org
//

import { ux } from '@oclif/core';

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { mapSpaces, printSpaces, waitForSpace } from '../../util';

export default class List extends BaseCommand<typeof List> {
  static override enableJsonFlag = true;
  static override description = 'List spaces.';
  static override flags = {
    ...BaseCommand.flags,
    ...ux.table.flags(),
  };

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const spaces = client.spaces.get();
      await Promise.all(spaces.map((space) => waitForSpace(space, (err) => this.error(err))));
      if (!this.flags.json) {
        printSpaces(spaces, this.flags);
      }

      // TODO(burdon): Show number of objects, members, feeds, mutations, etc.
      return mapSpaces(spaces);
    });
  }
}
