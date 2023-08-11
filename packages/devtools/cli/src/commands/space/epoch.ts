//
// Copyright 2022 DXOS.org
//

import { Args } from '@oclif/core';

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';

export default class Epoch extends BaseCommand<typeof Epoch> {
  static override enableJsonFlag = true;
  static override description = 'Create new epoch.';
  static override args = { key: Args.string({ description: 'Space key head in hex.' }) };

  async run(): Promise<any> {
    const { key } = this.args;
    return await this.execWithClient(async (client: Client) => {
      const space = await this.getSpace(client, key);
      await space.internal.createEpoch();
    });
  }
}
