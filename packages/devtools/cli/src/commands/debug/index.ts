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
    stats: {
      items: number;
    };
  }[];
};

export default class Debug extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'Debug info.';

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const data: DataDump = {};
      const identity = client.halo.identity.get();
      if (identity) {
        data.halo = {
          identityKey: identity?.identityKey?.toHex(),
        };

        // TODO(burdon): Stats (feed lengths, snapshot).
        data.spaces = client.spaces.get().map((space) => {
          const result = space.db.query();

          return {
            key: space.key.toHex(),
            stats: {
              items: result.objects.length,
            },
          };
        });
      }

      return data;
    });
  }
}
