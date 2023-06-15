//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';

import { Client } from '@dxos/client';

import { BaseCommand } from '../../../base-command';
import { queryCredentials, printCredentials, mapCredentials } from '../../../util';

export default class List extends BaseCommand<typeof List> {
  static override enableJsonFlag = true;
  static override description = 'List HALO credentials.';
  static override flags = {
    ...BaseCommand.flags,
    type: Flags.string({
      description: 'Type',
    }),
  };

  async run(): Promise<any> {
    const { type, json } = this.flags;

    return await this.execWithClient(async (client: Client) => {
      const identity = client.halo.identity;
      if (!identity) {
        throw new Error('Profile not initialized.');
      } else {
        const credentials = await queryCredentials(client, type);
        if (!json) {
          printCredentials(credentials, this.flags);
        }

        return mapCredentials(credentials);
      }
    });
  }
}
