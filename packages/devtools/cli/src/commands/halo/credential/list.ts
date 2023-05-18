//
// Copyright 2023 DXOS.org
//

import { Flags } from '@oclif/core';

import { Client } from '@dxos/client';

import { BaseCommand } from '../../../base-command';
import { queryCredentials, printCredentials, mapCredentials } from '../../../util';

export default class List extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'List HALO credentials.';
  static override flags = {
    ...BaseCommand.flags,
    type: Flags.string({
      description: 'Type',
    }),
  };

  async run(): Promise<any> {
    const { flags } = await this.parse(List);
    const { type, json } = flags;

    return await this.execWithClient(async (client: Client) => {
      const identity = client.halo.identity;
      if (!identity) {
        throw new Error('Profile not initialized.');
      } else {
        const credentials = await queryCredentials(client, type);
        if (!json) {
          printCredentials(credentials, flags);
        }

        return mapCredentials(credentials);
      }
    });
  }
}
