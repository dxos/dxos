//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';

type DataDump = {
  halo?: {
    identityKey: string;
  };
  spaces?: {
    key: string;
  }[];
};

export default class Debug extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Debug.';

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const data: DataDump = {};
      const identity = client.halo.identity.get();
      if (identity) {
        data.halo = {
          identityKey: identity?.identityKey?.toHex(),
        };

        // TODO(burdon): Stats.
        data.spaces = client.spaces.get().map((space) => ({
          key: space.key.toHex(),
        }));
      }

      console.log('debug', data);
      return data;
    });
  }
}
