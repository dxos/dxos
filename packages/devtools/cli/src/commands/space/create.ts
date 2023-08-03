//
// Copyright 2022 DXOS.org
//

import { Args } from '@oclif/core';

import { Client } from '@dxos/client';

import { BaseCommand } from '../../base-command';
import { waitForSpace } from '../../util';

export default class Create extends BaseCommand<typeof Create> {
  static override enableJsonFlag = true;
  static override description = 'Create space.';
  static override args = { name: Args.string() };

  async run(): Promise<any> {
    const { name } = this.args;
    return await this.execWithClient(async (client: Client) => {
      const space = await client.createSpace();
      await waitForSpace(space, (err) => this.catch(err));
      space.properties.name = name;
      const data = {
        key: space.key.toHex(),
        name: space.properties.name,
      };

      this.log(`Created: ${data.key}`);
      return data;
    }, true);
  }
}
