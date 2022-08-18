//
// Copyright 2022 DXOS.org
//

import { CliUx } from '@oclif/core';

import { Client } from '@dxos/client';
import { truncateKey } from '@dxos/debug';

import { BaseCommand } from '../../base-command';

export default class List extends BaseCommand {
  static override enableJsonFlag = true;
  static override description = 'List spaces.';
  static override flags = {
    ...BaseCommand.flags,
    ...CliUx.ux.table.flags()
  };

  async run (): Promise<any> {
    const { flags } = await this.parse(List);
    return await this.execWithClient(async (client: Client) => {
      const { value: parties = [] } = await client.echo.queryParties();
      if (!flags.json) {
        CliUx.ux.table(parties.map(party => ({
          key: truncateKey(party.key.toHex(), 8),
          name: party.getProperty('name')
        })), {
          key: {},
          name: {}
        }, {
          ...flags
        });
      }

      return parties.map(party => ({
        key: party.key.toHex(),
        name: party.getProperty('name')
      }));
    });
  }
}
