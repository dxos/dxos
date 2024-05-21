//
// Copyright 2022 DXOS.org
//

import { Args, ux } from '@oclif/core';
import chalk from 'chalk';

import { type Client } from '@dxos/client';

import { BaseCommand } from '../../base';
import { waitForSpace } from '../../util';

export default class Create extends BaseCommand<typeof Create> {
  static override enableJsonFlag = true;
  static override description = 'Create space.';
  static override args = { name: Args.string() };

  async run(): Promise<any> {
    return await this.execWithClient(async (client: Client) => {
      const space = await client.spaces.create();
      await waitForSpace(space, this.flags.timeout, (err) => this.catch(err));
      space.properties.name = this.args.name;
      const data = {
        key: space.key,
        name: space.properties.name,
      };

      ux.log(chalk`{green Created}: ${data.key.truncate()}`);
      return data;
    }, true);
  }
}
