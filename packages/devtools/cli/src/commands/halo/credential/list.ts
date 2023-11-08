//
// Copyright 2023 DXOS.org
//

import { Flags, ux } from '@oclif/core';

import { type Client } from '@dxos/client';

import { BaseCommand } from '../../../base-command';
import { queryCredentials, printCredentials, mapCredentials } from '../../../util';

export default class List extends BaseCommand<typeof List> {
  static override enableJsonFlag = true;
  static override description = 'List HALO credentials.';
  static override flags = {
    ...BaseCommand.flags,
    ...ux.table.flags(),
    type: Flags.string({
      description: 'Type',
    }),
  };

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const identity = client.halo.identity;
      if (!identity) {
        this.error('Profile not initialized.');
      }

      const credentials = await queryCredentials(client, this.flags.type);
      if (this.flags.json) {
        return mapCredentials(credentials);
      } else {
        printCredentials(credentials, this.flags);
      }
    });
  }
}
