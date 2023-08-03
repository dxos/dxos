//
// Copyright 2022 DXOS.org
//

import { Args, ux } from '@oclif/core';
import chalk from 'chalk';

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
      await waitForSpace(space, (err) => this.error(err));
      space.properties.name = name;
      const data = {
        key: space.key,
        name: space.properties.name,
      };

      ux.log(chalk`{green Created}: ${data.key.truncate()}`);
      return data;
    }, true);
  }
}
