//
// Copyright 2022 DXOS.org
//

import { ux, Args } from '@oclif/core';
import chalk from 'chalk';

import { waitForSpace } from '@dxos/cli-base';

import { BaseCommand } from '../../base';

export default class Create extends BaseCommand<typeof Create> {
  static override enableJsonFlag = true;
  static override description = 'Create space.';
  static override args = { name: Args.string() };

  async run(): Promise<any> {
    return await this.execWithClient(async ({ client }) => {
      const space = await client.spaces.create();
      await waitForSpace(space, this.flags.timeout, (err) => this.catch(err));
      space.properties.name = this.args.name;

      ux.stdout(chalk`{green Created}: ${space.key.truncate()}`);
      return {
        key: space.key,
        name: space.properties.name,
      };
    });
  }
}
